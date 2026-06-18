package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"anid.dev/chronicle/internal/storage"
)

func newTestHandler(t *testing.T) *Handler {
	t.Helper()
	t.Setenv("CHRONICLE_DB_PATH", filepath.Join(t.TempDir(), "test.db"))
	t.Setenv("CHRONICLE_SEED", "")
	s, err := storage.NewStorage()
	if err != nil {
		t.Fatalf("NewStorage() error = %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return NewHandler(s)
}

// rpc posts a JSON-RPC body and returns the decoded response (nil for an
// accepted notification with an empty body).
func rpc(t *testing.T, h *Handler, body string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Body.Len() == 0 {
		return nil
	}
	var resp map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v (body=%s)", err, rec.Body.String())
	}
	return resp
}

// callTool invokes a tool and returns its structuredContent and the JSON-RPC
// error object (one of them is nil).
func callTool(t *testing.T, h *Handler, name string, args any) (map[string]any, map[string]any) {
	t.Helper()
	ab, err := json.Marshal(args)
	if err != nil {
		t.Fatalf("marshal args: %v", err)
	}
	body := fmt.Sprintf(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":%q,"arguments":%s}}`, name, ab)
	resp := rpc(t, h, body)
	if e, ok := resp["error"].(map[string]any); ok {
		return nil, e
	}
	result, ok := resp["result"].(map[string]any)
	if !ok {
		t.Fatalf("tools/call %q: missing result (resp=%v)", name, resp)
	}
	// Tool execution failures are surfaced as a result with isError set; expose
	// the message under "message" so callers can assert on it uniformly.
	if isErr, _ := result["isError"].(bool); isErr {
		return nil, map[string]any{"message": toolErrorText(result)}
	}
	sc, _ := result["structuredContent"].(map[string]any)
	return sc, nil
}

func toolErrorText(result map[string]any) string {
	content, ok := result["content"].([]any)
	if !ok || len(content) == 0 {
		return ""
	}
	first, _ := content[0].(map[string]any)
	text, _ := first["text"].(string)
	return text
}

func createTrip(t *testing.T, h *Handler) string {
	t.Helper()
	sc, e := callTool(t, h, "create_trip", map[string]any{
		"name":        "Porto",
		"startDate":   "2026-06-10",
		"endDate":     "2026-06-15",
		"coordinates": map[string]any{"lat": 41.15, "lng": -8.61},
	})
	if e != nil {
		t.Fatalf("create_trip error: %v", e)
	}
	id, _ := sc["tripId"].(string)
	if id == "" {
		t.Fatalf("create_trip returned no tripId: %v", sc)
	}
	return id
}

func TestToolsListAdvertisesAllTools(t *testing.T) {
	h := newTestHandler(t)
	resp := rpc(t, h, `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`)
	tools, ok := resp["result"].(map[string]any)["tools"].([]any)
	if !ok {
		t.Fatalf("tools/list: unexpected shape %v", resp)
	}
	if len(tools) != 8 {
		t.Fatalf("expected 8 tools, got %d", len(tools))
	}
}

// TestUpdateTripPartialDateGuard covers the fix for a partial date patch that
// would invert the stored range.
func TestUpdateTripPartialDateGuard(t *testing.T) {
	h := newTestHandler(t)
	id := createTrip(t, h) // 2026-06-10 .. 2026-06-15

	// Only startDate, pushed past the stored endDate → must be rejected.
	_, e := callTool(t, h, "update_trip", map[string]any{
		"tripId": id,
		"patch":  map[string]any{"startDate": "2026-06-20"},
	})
	if e == nil {
		t.Fatalf("expected error for inverted partial date patch, got success")
	}
	if msg, _ := e["message"].(string); !strings.Contains(msg, "on or after startDate") {
		t.Fatalf("unexpected error message: %q", msg)
	}

	// A valid partial date patch still succeeds.
	sc, e := callTool(t, h, "update_trip", map[string]any{
		"tripId": id,
		"patch":  map[string]any{"endDate": "2026-06-18"},
	})
	if e != nil {
		t.Fatalf("valid partial date patch errored: %v", e)
	}
	if got, _ := sc["endDate"].(string); got != "2026-06-18" {
		t.Fatalf("expected endDate 2026-06-18, got %q", got)
	}
}

// TestUpdateTripPartialDateRace fires competing partial date patches concurrently
// (push startDate late vs. pull endDate early). Each is individually valid only
// against the original range, so without atomic read-validate-write they could
// both commit and invert the range. The invariant: the stored trip must never
// end up with endDate before startDate.
func TestUpdateTripPartialDateRace(t *testing.T) {
	h := newTestHandler(t)
	// Wide range so both competing edges start out valid.
	sc, e := callTool(t, h, "create_trip", map[string]any{
		"name":      "Race",
		"startDate": "2026-06-10",
		"endDate":   "2026-06-20",
	})
	if e != nil {
		t.Fatalf("create_trip error: %v", e)
	}
	id := sc["tripId"].(string)

	// No resets: goroutine A pushes startDate late, B pulls endDate early. Each is
	// valid only against the original range, so the loser's attempts must be
	// rejected against the winner's committed state. Any inversion persists, so a
	// regression would leave the final range inverted.
	const iterations = 50
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			callTool(t, h, "update_trip", map[string]any{
				"tripId": id, "patch": map[string]any{"startDate": "2026-06-18"},
			})
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			callTool(t, h, "update_trip", map[string]any{
				"tripId": id, "patch": map[string]any{"endDate": "2026-06-12"},
			})
		}
	}()
	wg.Wait()

	got, e := callTool(t, h, "get_trip", map[string]any{"tripId": id})
	if e != nil {
		t.Fatalf("get_trip error: %v", e)
	}
	start, _ := got["startDate"].(string)
	end, _ := got["endDate"].(string)
	if end < start {
		t.Fatalf("date range inverted under concurrency: start=%s end=%s", start, end)
	}
}

// TestUpdateTripClearsCoordinates covers the null-coordinate clearing fix end to
// end through the tool surface.
func TestUpdateTripClearsCoordinates(t *testing.T) {
	h := newTestHandler(t)
	id := createTrip(t, h)

	if _, e := callTool(t, h, "update_trip", map[string]any{
		"tripId": id,
		"patch":  map[string]any{"coordinates": nil},
	}); e != nil {
		t.Fatalf("clear coordinates errored: %v", e)
	}

	sc, e := callTool(t, h, "get_trip", map[string]any{"tripId": id})
	if e != nil {
		t.Fatalf("get_trip error: %v", e)
	}
	if v, present := sc["coordinates"]; present && v != nil {
		t.Fatalf("expected coordinates cleared, got %v", v)
	}
}

func TestLocationLifecycle(t *testing.T) {
	h := newTestHandler(t)
	id := createTrip(t, h)

	sc, e := callTool(t, h, "add_location", map[string]any{
		"tripId":      id,
		"name":        "Livraria Lello",
		"coordinates": map[string]any{"lat": 41.146, "lng": -8.615},
	})
	if e != nil {
		t.Fatalf("add_location error: %v", e)
	}
	lid, _ := sc["locationId"].(string)
	if lid == "" {
		t.Fatalf("add_location returned no locationId: %v", sc)
	}

	if _, e := callTool(t, h, "update_location", map[string]any{
		"tripId": id, "locationId": lid, "notes": "bookshop",
	}); e != nil {
		t.Fatalf("update_location error: %v", e)
	}

	// Deleting a missing location surfaces an error.
	if _, e := callTool(t, h, "delete_location", map[string]any{
		"tripId": id, "locationId": "does-not-exist",
	}); e == nil {
		t.Fatalf("expected error deleting unknown location")
	}

	if _, e := callTool(t, h, "delete_location", map[string]any{
		"tripId": id, "locationId": lid,
	}); e != nil {
		t.Fatalf("delete_location error: %v", e)
	}

	got, e := callTool(t, h, "get_trip", map[string]any{"tripId": id})
	if e != nil {
		t.Fatalf("get_trip error: %v", e)
	}
	if locs, _ := got["locations"].([]any); len(locs) != 0 {
		t.Fatalf("expected 0 locations after delete, got %d", len(locs))
	}
}

func TestListTripsWrapsArrayForStructuredContent(t *testing.T) {
	h := newTestHandler(t)
	createTrip(t, h)

	sc, e := callTool(t, h, "list_trips", map[string]any{})
	if e != nil {
		t.Fatalf("list_trips error: %v", e)
	}
	items, ok := sc["items"].([]any)
	if !ok {
		t.Fatalf("expected structuredContent.items array, got %v", sc)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 trip, got %d", len(items))
	}
}

func TestNotificationProducesNoResponse(t *testing.T) {
	h := newTestHandler(t)
	if resp := rpc(t, h, `{"jsonrpc":"2.0","method":"notifications/initialized"}`); resp != nil {
		t.Fatalf("expected no response body for notification, got %v", resp)
	}
}

// TestUnknownToolIsProtocolError: an unknown tool is a protocol fault and must
// come back as a JSON-RPC error, not a tools/call result.
func TestUnknownToolIsProtocolError(t *testing.T) {
	h := newTestHandler(t)
	resp := rpc(t, h, `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}`)
	if _, ok := resp["error"].(map[string]any); !ok {
		t.Fatalf("expected JSON-RPC error for unknown tool, got %v", resp)
	}
	if _, ok := resp["result"]; ok {
		t.Fatalf("unknown tool should not produce a result: %v", resp)
	}
}

// TestToolFailureIsIsErrorResult: a tool that runs but fails (here, get_trip on a
// missing id) must be a successful JSON-RPC response carrying isError, not a
// protocol-level error.
func TestToolFailureIsIsErrorResult(t *testing.T) {
	h := newTestHandler(t)
	resp := rpc(t, h, `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_trip","arguments":{"tripId":"99999"}}}`)
	if _, ok := resp["error"]; ok {
		t.Fatalf("tool failure must not be a JSON-RPC error: %v", resp)
	}
	result, ok := resp["result"].(map[string]any)
	if !ok {
		t.Fatalf("expected a result object, got %v", resp)
	}
	if isErr, _ := result["isError"].(bool); !isErr {
		t.Fatalf("expected isError=true on tool failure, got %v", result)
	}
	if msg := toolErrorText(result); !strings.Contains(msg, "trip not found") {
		t.Fatalf("unexpected tool error text: %q", msg)
	}
}
