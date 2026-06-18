// Package mcp exposes Travelog's trip data over a minimal Model Context Protocol
// (MCP) endpoint: a single JSON-RPC 2.0 route at POST /mcp.
//
// Like the REST surface it sits alongside, it ships no authentication and is
// meant to be reached over a private/local-only network (the server binds to
// CHRONICLE_HOST, localhost by default). Add auth before exposing it publicly.
//
// Only the handful of methods clients need to discover and invoke tools and
// reference resources are implemented:
//
//	initialize, tools/list, tools/call,
//	resources/list, resources/templates/list, resources/read
//
// This keeps the dependency footprint at zero (standard library only) and the
// surface easy to audit, mirroring the Hopper backend's approach.
package mcp

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"reflect"
	"strings"

	"anid.dev/chronicle/internal/storage"
)

const protocolVersion = "2024-11-05"

// Storage is the slice of the storage layer the MCP tools and resources need.
// *storage.Storage satisfies it. MutateLocations is required so single-location
// edits are atomic rather than racy read-modify-write cycles.
type Storage interface {
	GetTrips() ([]storage.Trip, error)
	GetTrip(id int64) (storage.Trip, error)
	AddTrip(t storage.Trip) (int64, error)
	UpdateTrip(id int64, updates map[string]interface{}) error
	UpdateTripAtomic(id int64, prepare func(current storage.Trip) (map[string]interface{}, error)) error
	DeleteTrip(id int64) error
	MutateLocations(id int64, mutate func(current []storage.Location) ([]storage.Location, error)) error
}

var instructions = strings.Join([]string{
	"Travelog stores trips and the locations (hotels, restaurants, attractions) visited on them.",
	"",
	"Before creating a trip, list_trips to avoid duplicates.",
	"Dates are calendar dates (YYYY-MM-DD); endDate must be on or after startDate.",
	"A trip's `coordinates` is its map center; `locations` are individual stops, each with its own coordinates.",
	"Prefer add_location / update_location / delete_location to edit a single stop; they read-modify-write the array for you.",
	"update_trip applies a partial patch — only the keys you include change, and passing `locations` replaces the whole array.",
}, "\n")

// Handler implements the MCP JSON-RPC endpoint as an http.Handler.
type Handler struct {
	store Storage
	tools []toolDef
}

// NewHandler builds the MCP handler over a storage backend.
func NewHandler(store Storage) *Handler {
	return &Handler{store: store, tools: buildTools(store)}
}

type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeJSON(w, http.StatusMethodNotAllowed, errResponse(nil, -32600, "only POST is supported"))
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil || len(body) == 0 {
		writeJSON(w, http.StatusBadRequest, errResponse(nil, -32600, "empty or unreadable body"))
		return
	}

	// A JSON-RPC request is either a single object or a batch array.
	trimmed := bytesTrimSpace(body)
	if len(trimmed) > 0 && trimmed[0] == '[' {
		var reqs []rpcRequest
		if err := json.Unmarshal(body, &reqs); err != nil {
			writeJSON(w, http.StatusBadRequest, errResponse(nil, -32700, "parse error"))
			return
		}
		responses := make([]rpcResponse, 0, len(reqs))
		for i := range reqs {
			if resp, ok := h.dispatch(&reqs[i]); ok {
				responses = append(responses, resp)
			}
		}
		writeJSON(w, http.StatusOK, responses)
		return
	}

	var req rpcRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResponse(nil, -32700, "parse error"))
		return
	}
	resp, ok := h.dispatch(&req)
	if !ok {
		// Notification: acknowledge with no body.
		w.WriteHeader(http.StatusAccepted)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// dispatch handles a single JSON-RPC request. The second return value is false
// for notifications (requests without an id), which expect no response.
func (h *Handler) dispatch(req *rpcRequest) (rpcResponse, bool) {
	isNotification := len(req.ID) == 0

	result, rerr := h.route(req)
	if isNotification {
		return rpcResponse{}, false
	}
	if rerr != nil {
		return errResponse(req.ID, rerr.Code, rerr.Message), true
	}
	return rpcResponse{JSONRPC: "2.0", ID: req.ID, Result: result}, true
}

func (h *Handler) route(req *rpcRequest) (any, *rpcError) {
	switch req.Method {
	case "initialize":
		return map[string]any{
			"protocolVersion": protocolVersion,
			"serverInfo":      map[string]any{"name": "travelog", "version": "0.1.0"},
			"capabilities":    map[string]any{"tools": map[string]any{}, "resources": map[string]any{}},
			"instructions":    instructions,
		}, nil

	case "ping":
		return map[string]any{}, nil

	case "tools/list":
		return map[string]any{"tools": h.toolList()}, nil

	case "tools/call":
		return h.callTool(req.Params)

	case "resources/list":
		entries, err := listResources(h.store)
		if err != nil {
			return nil, &rpcError{Code: -32000, Message: err.Error()}
		}
		return map[string]any{"resources": entries}, nil

	case "resources/templates/list":
		return map[string]any{"resourceTemplates": listResourceTemplates()}, nil

	case "resources/read":
		var p struct {
			URI string `json:"uri"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil || p.URI == "" {
			return nil, &rpcError{Code: -32602, Message: "missing required param: uri"}
		}
		contents, err := readResource(h.store, p.URI)
		if err != nil {
			return nil, &rpcError{Code: -32000, Message: err.Error()}
		}
		return map[string]any{"contents": []resourceContents{contents}}, nil

	default:
		return nil, &rpcError{Code: -32601, Message: "method not found: " + req.Method}
	}
}

func (h *Handler) toolList() []map[string]any {
	out := make([]map[string]any, 0, len(h.tools))
	for _, t := range h.tools {
		out = append(out, map[string]any{
			"name":        t.name,
			"description": t.description,
			"inputSchema": t.inputSchema,
		})
	}
	return out
}

func (h *Handler) callTool(params json.RawMessage) (any, *rpcError) {
	var p struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &rpcError{Code: -32602, Message: "invalid params"}
	}
	var tool *toolDef
	for i := range h.tools {
		if h.tools[i].name == p.Name {
			tool = &h.tools[i]
			break
		}
	}
	if tool == nil {
		return nil, &rpcError{Code: -32601, Message: "unknown tool: " + p.Name}
	}

	args := p.Arguments
	if len(args) == 0 {
		args = json.RawMessage("{}")
	}
	result, err := tool.handler(args)
	if err != nil {
		// A tool that ran but failed (not found, validation, business rules) is
		// reported as a successful JSON-RPC response with isError set, per the
		// MCP spec — not as a protocol-level error — so the client and model can
		// read the message and react. JSON-RPC errors are reserved for protocol
		// faults (unknown tool, unparseable params), handled above.
		return map[string]any{
			"content": []map[string]any{{"type": "text", "text": err.Error()}},
			"isError": true,
		}, nil
	}

	text, _ := json.Marshal(result)
	return map[string]any{
		"content":           []map[string]any{{"type": "text", "text": string(text)}},
		"structuredContent": asStructured(result),
	}, nil
}

// asStructured guarantees MCP's structuredContent is a JSON object: bare arrays
// (e.g. list_trips) are wrapped under an `items` key so strict clients accept it.
func asStructured(result any) any {
	if result == nil {
		return map[string]any{}
	}
	switch reflect.TypeOf(result).Kind() {
	case reflect.Slice, reflect.Array:
		return map[string]any{"items": result}
	default:
		return result
	}
}

func errResponse(id json.RawMessage, code int, message string) rpcResponse {
	return rpcResponse{JSONRPC: "2.0", ID: id, Error: &rpcError{Code: code, Message: message}}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("mcp: failed to encode response: %v", err)
	}
}

func bytesTrimSpace(b []byte) []byte {
	i := 0
	for i < len(b) {
		switch b[i] {
		case ' ', '\t', '\r', '\n':
			i++
		default:
			return b[i:]
		}
	}
	return b[i:]
}
