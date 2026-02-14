package storage

import (
	"database/sql"
	"path/filepath"
	"testing"
)

func newTestStorage(t *testing.T, seed bool) *Storage {
	t.Helper()
	t.Setenv("CHRONICLE_DB_PATH", filepath.Join(t.TempDir(), "test.db"))
	if seed {
		t.Setenv("CHRONICLE_SEED", "true")
	} else {
		t.Setenv("CHRONICLE_SEED", "")
	}

	s, err := NewStorage()
	if err != nil {
		t.Fatalf("NewStorage() error = %v", err)
	}
	t.Cleanup(func() {
		_ = s.Close()
	})

	return s
}

func TestNewStorage_NoSeedByDefault(t *testing.T) {
	s := newTestStorage(t, false)

	trips, err := s.GetTrips()
	if err != nil {
		t.Fatalf("GetTrips() error = %v", err)
	}
	if len(trips) != 0 {
		t.Fatalf("expected 0 trips without seeding, got %d", len(trips))
	}
}

func TestNewStorage_SeedsWhenEnabled(t *testing.T) {
	s := newTestStorage(t, true)

	trips, err := s.GetTrips()
	if err != nil {
		t.Fatalf("GetTrips() error = %v", err)
	}
	if len(trips) != len(initialTrips) {
		t.Fatalf("expected %d seeded trips, got %d", len(initialTrips), len(trips))
	}
}

func TestStorage_CRUDAndJSONFields(t *testing.T) {
	s := newTestStorage(t, false)

	notes := "Planning notes"
	insertedID, err := s.AddTrip(Trip{
		Name:      "Integration Trip",
		StartDate: "2025-01-01",
		EndDate:   "2025-01-02",
		Color:     "#123456",
		Notes:     &notes,
		Coordinates: &Coordinate{
			Lat: 10.5,
			Lng: 20.5,
		},
		Locations: []Location{{
			ID:   "loc-1",
			Name: "Checkpoint",
			Coordinates: Coordinate{
				Lat: 11.1,
				Lng: 22.2,
			},
			Date: "2025-01-01",
		}},
	})
	if err != nil {
		t.Fatalf("AddTrip() error = %v", err)
	}

	trip, err := s.GetTrip(insertedID)
	if err != nil {
		t.Fatalf("GetTrip() error = %v", err)
	}
	if trip.Name != "Integration Trip" {
		t.Fatalf("unexpected trip name %q", trip.Name)
	}
	if trip.Coordinates == nil || trip.Coordinates.Lat != 10.5 {
		t.Fatalf("unexpected coordinates %+v", trip.Coordinates)
	}
	if len(trip.Locations) != 1 || trip.Locations[0].ID != "loc-1" {
		t.Fatalf("unexpected locations %+v", trip.Locations)
	}

	updates := map[string]interface{}{
		"name": "Updated Trip",
		"locations": []map[string]interface{}{
			{
				"id":   "loc-2",
				"name": "Updated Stop",
				"coordinates": map[string]float64{
					"lat": 33.3,
					"lng": 44.4,
				},
			},
		},
		"coordinates": map[string]float64{"lat": 12.3, "lng": 45.6},
	}
	if err := s.UpdateTrip(insertedID, updates); err != nil {
		t.Fatalf("UpdateTrip() error = %v", err)
	}

	updated, err := s.GetTrip(insertedID)
	if err != nil {
		t.Fatalf("GetTrip() after update error = %v", err)
	}
	if updated.Name != "Updated Trip" {
		t.Fatalf("expected updated name, got %q", updated.Name)
	}
	if updated.Coordinates == nil || updated.Coordinates.Lng != 45.6 {
		t.Fatalf("unexpected updated coordinates %+v", updated.Coordinates)
	}
	if len(updated.Locations) != 1 || updated.Locations[0].ID != "loc-2" {
		t.Fatalf("unexpected updated locations %+v", updated.Locations)
	}

	if err := s.DeleteTrip(insertedID); err != nil {
		t.Fatalf("DeleteTrip() error = %v", err)
	}

	_, err = s.GetTrip(insertedID)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}
