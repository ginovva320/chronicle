package trip

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"anid.dev/chronicle/internal/storage"
)

// StorageService defines the interface that the trip handler relies on, updated for complex fields.
type StorageService interface {
	Close() error
	GetTrips() ([]storage.Trip, error)
	GetTrip(id int64) (storage.Trip, error)
	AddTrip(t storage.Trip) (int64, error)
	// UpdateTrip now accepts a map to handle partial updates of various field types
	UpdateTrip(id int64, updates map[string]interface{}) error
	DeleteTrip(id int64) error
}

// Handler holds the storage dependency and implements the http.Handler methods.
type Handler struct {
	storage StorageService
}

// NewHandler creates a new instance of the trip handler, injecting the storage dependency.
func NewHandler(s StorageService) *Handler {
	return &Handler{storage: s}
}

// ServeHTTP implements the http.Handler interface and acts as the main router.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// The path received here will be /api/trips or /api/trips/123
	path := strings.TrimPrefix(r.URL.Path, "/api/trips")
	path = strings.Trim(path, "/")

	if path != "" {
		h.handleTripByID(w, r, path)
		return
	}

	// Handle requests to /api/trips (no ID)
	switch r.Method {
	case http.MethodGet:
		h.getTripsHandler(w, r)
	case http.MethodPost:
		h.addTripHandler(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// handleTripByID routes requests based on the HTTP method for a specific trip ID.
func (h *Handler) handleTripByID(w http.ResponseWriter, r *http.Request, idStr string) {
	// Since the frontend ID is a string, we parse it back to int64 for the DB layer
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid trip ID format")
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getTripHandler(w, r, id)
	case http.MethodPatch:
		h.updateTripHandler(w, r, id)
	case http.MethodDelete:
		h.deleteTripHandler(w, r, id)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// --- CRUD Handler Implementations ---

// getTripsHandler handles GET /api/trips
func (h *Handler) getTripsHandler(w http.ResponseWriter, r *http.Request) {
	trips, err := h.storage.GetTrips()
	if err != nil {
		log.Printf("Error fetching trips: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to retrieve trips")
		return
	}
	writeJSON(w, http.StatusOK, trips)
}

// addTripHandler handles POST /api/trips
func (h *Handler) addTripHandler(w http.ResponseWriter, r *http.Request) {
	var newTrip storage.Trip
	if err := decodeJSON(r, &newTrip); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if validationErrors := validateTripCreate(&newTrip); validationErrors != nil {
		writeValidationError(w, http.StatusBadRequest, validationErrors)
		return
	}

	insertedID, err := h.storage.AddTrip(newTrip)
	if err != nil {
		log.Printf("Error inserting trip: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to create trip")
		return
	}

	// Set the returned DB ID (as a string) before responding to the client
	newTrip.ID = fmt.Sprintf("%d", insertedID)
	writeJSON(w, http.StatusCreated, newTrip)
}

// getTripHandler handles GET /api/trips/{id}
func (h *Handler) getTripHandler(w http.ResponseWriter, r *http.Request, id int64) {
	trip, err := h.storage.GetTrip(id)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, fmt.Sprintf("Trip with ID %d not found", id))
		return
	}
	if err != nil {
		log.Printf("Error fetching trip %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Failed to retrieve trip")
		return
	}
	writeJSON(w, http.StatusOK, trip)
}

// updateTripHandler handles PATCH /api/trips/{id}
func (h *Handler) updateTripHandler(w http.ResponseWriter, r *http.Request, id int64) {
	// Decode the request body into a generic map to handle partial updates of any field
	var updates map[string]interface{}
	if err := decodeJSON(r, &updates); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid update payload")
		return
	}
	if validationErrors := validateTripUpdates(updates); validationErrors != nil {
		writeValidationError(w, http.StatusBadRequest, validationErrors)
		return
	}

	// Pass the map directly to the storage layer for processing
	err := h.storage.UpdateTrip(id, updates)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, fmt.Sprintf("Trip with ID %d not found for update", id))
		return
	}
	if err != nil {
		log.Printf("Error updating trip %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Failed to update trip")
		return
	}

	// Fetch the updated trip to return the final state to the client
	updatedTrip, err := h.storage.GetTrip(id)
	if err != nil {
		log.Printf("Error fetching updated trip %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Update successful but failed to fetch final trip state")
		return
	}

	writeJSON(w, http.StatusOK, updatedTrip)
}

// deleteTripHandler handles DELETE /api/trips/{id}
func (h *Handler) deleteTripHandler(w http.ResponseWriter, r *http.Request, id int64) {
	err := h.storage.DeleteTrip(id)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, fmt.Sprintf("Trip with ID %d not found for deletion", id))
		return
	}
	if err != nil {
		log.Printf("Error deleting trip %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Failed to delete trip")
		return
	}

	// Respond with 204 No Content for a successful deletion
	w.WriteHeader(http.StatusNoContent)
}

// --- Utility Functions ---

// writeJSON writes a JSON response with the specified status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding response JSON: %v", err)
	}
}

// writeError writes an error message as JSON.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeValidationError(w http.ResponseWriter, status int, details map[string]string) {
	writeJSON(w, status, map[string]interface{}{
		"error":   "validation_failed",
		"details": details,
	})
}

// decodeJSON decodes the JSON request body into the target interface.
func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}
