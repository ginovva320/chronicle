package mcp

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"anid.dev/chronicle/internal/storage"
	"anid.dev/chronicle/internal/trip"
)

// toolDef is a single MCP tool: its advertised schema plus a handler that takes
// the raw JSON arguments and returns a JSON-serializable result.
type toolDef struct {
	name        string
	description string
	inputSchema map[string]any
	handler     func(args json.RawMessage) (any, error)
}

// buildTools returns the tool set bound to a storage backend. Handlers reuse the
// same validation rules as the REST API (internal/trip) so the two surfaces stay
// in lock-step.
func buildTools(store Storage) []toolDef {
	return []toolDef{
		{
			name:        "list_trips",
			description: "List all trips with their locations. Returns an array of trips.",
			inputSchema: object(nil),
			handler: func(json.RawMessage) (any, error) {
				trips, err := store.GetTrips()
				if err != nil {
					return nil, err
				}
				if trips == nil {
					trips = []storage.Trip{}
				}
				return trips, nil
			},
		},
		{
			name:        "get_trip",
			description: "Fetch a single trip and its locations by id.",
			inputSchema: object(map[string]any{
				"tripId": str("Trip id (the numeric id as a string)."),
			}, "tripId"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID string `json:"tripId"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				return getTripByID(store, a.TripID)
			},
		},
		{
			name: "create_trip",
			description: "Create a new trip. Dates are calendar dates (YYYY-MM-DD) and endDate must be on " +
				"or after startDate. `coordinates` is the trip's map center; `locations` are individual " +
				"stops (hotels, restaurants, attractions) and may be omitted. Location ids are minted " +
				"automatically when not supplied. Returns { tripId }.",
			inputSchema: object(map[string]any{
				"name":        str("Trip name."),
				"startDate":   str("Start date, YYYY-MM-DD."),
				"endDate":     str("End date, YYYY-MM-DD. Must be on or after startDate."),
				"color":       str("Optional hex color used to distinguish the trip in the UI."),
				"notes":       str("Optional free-form notes."),
				"coordinates": coordSchema("Optional map center for the trip."),
				"locations": map[string]any{
					"type":        "array",
					"description": "Optional list of stops. id is minted automatically when omitted.",
					"items":       locationSchema(false),
				},
			}, "name", "startDate", "endDate"),
			handler: func(args json.RawMessage) (any, error) {
				var t storage.Trip
				if err := json.Unmarshal(args, &t); err != nil {
					return nil, err
				}
				if t.Locations == nil {
					t.Locations = []storage.Location{}
				}
				for i := range t.Locations {
					if strings.TrimSpace(t.Locations[i].ID) == "" {
						t.Locations[i].ID = newID()
					}
				}
				if verrs := trip.ValidateTripCreate(&t); verrs != nil {
					return nil, validationError(verrs)
				}
				id, err := store.AddTrip(t)
				if err != nil {
					return nil, err
				}
				return map[string]any{"tripId": strconv.FormatInt(id, 10)}, nil
			},
		},
		{
			name: "update_trip",
			description: "Patch fields on an existing trip. Only keys present in `patch` change. Allowed keys: " +
				"name, startDate, endDate, color, notes, coordinates, locations. Passing `locations` or " +
				"`coordinates` replaces them wholesale. Returns the updated trip.",
			inputSchema: object(map[string]any{
				"tripId": str("Trip id (the numeric id as a string)."),
				"patch": map[string]any{
					"type":        "object",
					"description": "Fields to change. At least one of: name, startDate, endDate, color, notes, coordinates, locations.",
					"properties": map[string]any{
						"name":        str("Trip name."),
						"startDate":   str("Start date, YYYY-MM-DD."),
						"endDate":     str("End date, YYYY-MM-DD."),
						"color":       str("Hex color."),
						"notes":       str("Free-form notes."),
						"coordinates": coordSchemaNullable("Map center, or null to clear."),
						"locations": map[string]any{
							"type":  "array",
							"items": locationSchema(true),
						},
					},
					"additionalProperties": false,
				},
			}, "tripId", "patch"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID string                 `json:"tripId"`
					Patch  map[string]interface{} `json:"patch"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				id, err := parseTripID(a.TripID)
				if err != nil {
					return nil, err
				}
				if verrs := trip.ValidateTripUpdates(a.Patch); verrs != nil {
					return nil, validationError(verrs)
				}
				// ValidateTripUpdates only cross-checks start/end when both are in
				// the patch. For a partial date patch we must compare the changed
				// bound against the trip's stored opposite bound — and do so
				// atomically with the write, or two concurrent partial patches can
				// each validate against the original snapshot and together persist
				// an inverted range. UpdateTripAtomic runs prepare under the
				// storage lock against a fresh read.
				startRaw, hasStart := a.Patch["startDate"]
				endRaw, hasEnd := a.Patch["endDate"]
				err = store.UpdateTripAtomic(id, func(current storage.Trip) (map[string]interface{}, error) {
					if hasStart != hasEnd {
						effStart, effEnd := current.StartDate, current.EndDate
						if hasStart {
							effStart, _ = startRaw.(string)
						} else {
							effEnd, _ = endRaw.(string)
						}
						if verrs := trip.ValidateTripUpdates(map[string]interface{}{
							"startDate": effStart,
							"endDate":   effEnd,
						}); verrs != nil {
							return nil, validationError(verrs)
						}
					}
					return a.Patch, nil
				})
				if err == sql.ErrNoRows {
					return nil, fmt.Errorf("trip not found: %s", a.TripID)
				} else if err != nil {
					return nil, err
				}
				return getTripByID(store, a.TripID)
			},
		},
		{
			name:        "delete_trip",
			description: "Delete a trip by id. Returns { ok: true }.",
			inputSchema: object(map[string]any{
				"tripId": str("Trip id (the numeric id as a string)."),
			}, "tripId"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID string `json:"tripId"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				id, err := parseTripID(a.TripID)
				if err != nil {
					return nil, err
				}
				if err := store.DeleteTrip(id); err == sql.ErrNoRows {
					return nil, fmt.Errorf("trip not found: %s", a.TripID)
				} else if err != nil {
					return nil, err
				}
				return map[string]any{"ok": true}, nil
			},
		},
		{
			name: "add_location",
			description: "Add a single location (hotel, restaurant, attraction, etc.) to a trip. Performs a " +
				"read-modify-write on the trip's locations array; the location id is minted automatically. " +
				"Returns { locationId }.",
			inputSchema: object(map[string]any{
				"tripId":      str("Trip id to add the location to."),
				"name":        str("Location name."),
				"coordinates": coordSchema("Location coordinates."),
				"notes":       str("Optional notes."),
				"date":        str("Optional date, YYYY-MM-DD."),
			}, "tripId", "name", "coordinates"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID      string              `json:"tripId"`
					Name        string              `json:"name"`
					Coordinates *storage.Coordinate `json:"coordinates"`
					Notes       string              `json:"notes"`
					Date        string              `json:"date"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				if a.Coordinates == nil {
					return nil, fmt.Errorf("coordinates is required")
				}
				id, err := parseTripID(a.TripID)
				if err != nil {
					return nil, err
				}
				loc := storage.Location{
					ID:          newID(),
					Name:        a.Name,
					Coordinates: *a.Coordinates,
					Notes:       a.Notes,
					Date:        a.Date,
				}
				if err := mutateLocations(store, id, a.TripID, func(current []storage.Location) ([]storage.Location, error) {
					next := append(current, loc)
					if verrs := trip.ValidateLocations(next); verrs != nil {
						return nil, validationError(verrs)
					}
					return next, nil
				}); err != nil {
					return nil, err
				}
				return map[string]any{"locationId": loc.ID}, nil
			},
		},
		{
			name: "update_location",
			description: "Patch a single location on a trip. Only the fields you pass change; omit a field to " +
				"leave it untouched. Pass coordinates as a full { lat, lng } object. Returns the updated location.",
			inputSchema: object(map[string]any{
				"tripId":      str("Trip id the location belongs to."),
				"locationId":  str("Location id to update."),
				"name":        str("New name."),
				"coordinates": coordSchema("New coordinates."),
				"notes":       str("New notes."),
				"date":        str("New date, YYYY-MM-DD."),
			}, "tripId", "locationId"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID      string              `json:"tripId"`
					LocationID  string              `json:"locationId"`
					Name        *string             `json:"name"`
					Coordinates *storage.Coordinate `json:"coordinates"`
					Notes       *string             `json:"notes"`
					Date        *string             `json:"date"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				id, err := parseTripID(a.TripID)
				if err != nil {
					return nil, err
				}
				var updated storage.Location
				if err := mutateLocations(store, id, a.TripID, func(current []storage.Location) ([]storage.Location, error) {
					idx := indexOfLocation(current, a.LocationID)
					if idx < 0 {
						return nil, fmt.Errorf("location not found: %s", a.LocationID)
					}
					if a.Name != nil {
						current[idx].Name = *a.Name
					}
					if a.Coordinates != nil {
						current[idx].Coordinates = *a.Coordinates
					}
					if a.Notes != nil {
						current[idx].Notes = *a.Notes
					}
					if a.Date != nil {
						current[idx].Date = *a.Date
					}
					if verrs := trip.ValidateLocations(current); verrs != nil {
						return nil, validationError(verrs)
					}
					updated = current[idx]
					return current, nil
				}); err != nil {
					return nil, err
				}
				return updated, nil
			},
		},
		{
			name:        "delete_location",
			description: "Remove a single location from a trip. Returns { ok: true }.",
			inputSchema: object(map[string]any{
				"tripId":     str("Trip id the location belongs to."),
				"locationId": str("Location id to remove."),
			}, "tripId", "locationId"),
			handler: func(args json.RawMessage) (any, error) {
				var a struct {
					TripID     string `json:"tripId"`
					LocationID string `json:"locationId"`
				}
				if err := json.Unmarshal(args, &a); err != nil {
					return nil, err
				}
				id, err := parseTripID(a.TripID)
				if err != nil {
					return nil, err
				}
				if err := mutateLocations(store, id, a.TripID, func(current []storage.Location) ([]storage.Location, error) {
					idx := indexOfLocation(current, a.LocationID)
					if idx < 0 {
						return nil, fmt.Errorf("location not found: %s", a.LocationID)
					}
					return append(current[:idx:idx], current[idx+1:]...), nil
				}); err != nil {
					return nil, err
				}
				return map[string]any{"ok": true}, nil
			},
		},
	}
}

func getTripByID(store Storage, idStr string) (storage.Trip, error) {
	id, err := parseTripID(idStr)
	if err != nil {
		return storage.Trip{}, err
	}
	t, err := store.GetTrip(id)
	if err == sql.ErrNoRows {
		return storage.Trip{}, fmt.Errorf("trip not found: %s", idStr)
	}
	if err != nil {
		return storage.Trip{}, err
	}
	return t, nil
}

// mutateLocations runs an atomic location mutation and translates a missing-trip
// error into the same friendly message the other tools use.
func mutateLocations(store Storage, id int64, idStr string, mutate func([]storage.Location) ([]storage.Location, error)) error {
	err := store.MutateLocations(id, mutate)
	if err == sql.ErrNoRows {
		return fmt.Errorf("trip not found: %s", idStr)
	}
	return err
}

func parseTripID(s string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid trip id %q: must be a numeric string", s)
	}
	return id, nil
}

func indexOfLocation(locations []storage.Location, id string) int {
	for i := range locations {
		if locations[i].ID == id {
			return i
		}
	}
	return -1
}

// validationError flattens a field→message validation map into a single,
// deterministic error string suitable for a JSON-RPC error payload.
func validationError(errs map[string]string) error {
	parts := make([]string, 0, len(errs))
	for k, v := range errs {
		parts = append(parts, fmt.Sprintf("%s: %s", k, v))
	}
	sort.Strings(parts)
	return fmt.Errorf("validation failed: %s", strings.Join(parts, "; "))
}

// --- tiny JSON Schema builders (the data model is small enough to hand-write) ---

func object(props map[string]any, required ...string) map[string]any {
	if props == nil {
		props = map[string]any{}
	}
	m := map[string]any{
		"type":                 "object",
		"properties":           props,
		"additionalProperties": false,
	}
	if len(required) > 0 {
		m["required"] = required
	}
	return m
}

func str(desc string) map[string]any {
	return map[string]any{"type": "string", "description": desc}
}

func num(desc string) map[string]any {
	return map[string]any{"type": "number", "description": desc}
}

func coordSchema(desc string) map[string]any {
	return map[string]any{
		"type":        "object",
		"description": desc,
		"properties": map[string]any{
			"lat": num("Latitude, between -90 and 90."),
			"lng": num("Longitude, between -180 and 180."),
		},
		"required":             []string{"lat", "lng"},
		"additionalProperties": false,
	}
}

// coordSchemaNullable is coordSchema that also accepts JSON null, used where a
// patch may clear coordinates (update_trip).
func coordSchemaNullable(desc string) map[string]any {
	s := coordSchema(desc)
	s["type"] = []string{"object", "null"}
	return s
}

// locationSchema describes a location object. When requireID is true the `id`
// field is required (used by update_trip, which replaces the array wholesale and
// must keep stable ids); create_trip mints ids so it leaves id optional.
func locationSchema(requireID bool) map[string]any {
	required := []string{"name", "coordinates"}
	if requireID {
		required = append([]string{"id"}, required...)
	}
	return object(map[string]any{
		"id":          str("Stable location id."),
		"name":        str("Location name."),
		"coordinates": coordSchema("Location coordinates."),
		"notes":       str("Optional notes."),
		"date":        str("Optional date, YYYY-MM-DD."),
	}, required...)
}
