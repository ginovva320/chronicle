package trip

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"anid.dev/chronicle/internal/storage"
)

type mockStorage struct {
	getTripsFn   func() ([]storage.Trip, error)
	getTripFn    func(id int64) (storage.Trip, error)
	addTripFn    func(t storage.Trip) (int64, error)
	updateTripFn func(id int64, updates map[string]interface{}) error
	deleteTripFn func(id int64) error
}

func (m *mockStorage) Close() error { return nil }

func (m *mockStorage) GetTrips() ([]storage.Trip, error) {
	if m.getTripsFn != nil {
		return m.getTripsFn()
	}
	return nil, nil
}

func (m *mockStorage) GetTrip(id int64) (storage.Trip, error) {
	if m.getTripFn != nil {
		return m.getTripFn(id)
	}
	return storage.Trip{}, sql.ErrNoRows
}

func (m *mockStorage) AddTrip(t storage.Trip) (int64, error) {
	if m.addTripFn != nil {
		return m.addTripFn(t)
	}
	return 1, nil
}

func (m *mockStorage) UpdateTrip(id int64, updates map[string]interface{}) error {
	if m.updateTripFn != nil {
		return m.updateTripFn(id, updates)
	}
	return nil
}

func (m *mockStorage) DeleteTrip(id int64) error {
	if m.deleteTripFn != nil {
		return m.deleteTripFn(id)
	}
	return nil
}

func TestAddTripValidationError(t *testing.T) {
	h := NewHandler(&mockStorage{})

	payload := map[string]interface{}{
		"name":      "",
		"startDate": "2026-99-01",
		"endDate":   "2026-01-01",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/trips", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if resp["error"] != "validation_failed" {
		t.Fatalf("expected validation_failed, got %#v", resp["error"])
	}
}

func TestAddTripSuccess(t *testing.T) {
	var captured storage.Trip
	h := NewHandler(&mockStorage{
		addTripFn: func(t storage.Trip) (int64, error) {
			captured = t
			return 42, nil
		},
	})

	payload := map[string]interface{}{
		"name":      " Valid Name ",
		"startDate": "2026-01-01",
		"endDate":   "2026-01-03",
		"locations": []interface{}{},
		"color":     "#222222",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/trips", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", rec.Code)
	}
	if captured.Name != "Valid Name" {
		t.Fatalf("expected trimmed name to be persisted, got %q", captured.Name)
	}

	var trip storage.Trip
	if err := json.Unmarshal(rec.Body.Bytes(), &trip); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if trip.ID != "42" {
		t.Fatalf("expected returned id 42, got %q", trip.ID)
	}
}

func TestPatchValidationError(t *testing.T) {
	h := NewHandler(&mockStorage{})

	body := []byte(`{"foo":"bar"}`)
	req := httptest.NewRequest(http.MethodPatch, "/api/trips/1", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}
}

func TestGetTripNotFound(t *testing.T) {
	h := NewHandler(&mockStorage{
		getTripFn: func(id int64) (storage.Trip, error) {
			return storage.Trip{}, sql.ErrNoRows
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/trips/999", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rec.Code)
	}
}

func TestDeleteTripSuccess(t *testing.T) {
	called := false
	h := NewHandler(&mockStorage{
		deleteTripFn: func(id int64) error {
			called = true
			if id != 7 {
				return fmt.Errorf("unexpected id %d", id)
			}
			return nil
		},
	})

	req := httptest.NewRequest(http.MethodDelete, "/api/trips/7", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
	if !called {
		t.Fatal("expected delete to be called")
	}
}
