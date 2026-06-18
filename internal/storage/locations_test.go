package storage

import (
	"database/sql"
	"fmt"
	"sync"
	"testing"
)

// TestUpdateTripClearCoordinates verifies that patching coordinates to nil stores
// SQL NULL and reads back as a nil pointer rather than a bogus {0,0}.
func TestUpdateTripClearCoordinates(t *testing.T) {
	s := newTestStorage(t, false)

	id, err := s.AddTrip(Trip{
		Name:        "Porto",
		StartDate:   "2026-06-10",
		EndDate:     "2026-06-15",
		Locations:   []Location{},
		Coordinates: &Coordinate{Lat: 41.15, Lng: -8.61},
	})
	if err != nil {
		t.Fatalf("AddTrip() error = %v", err)
	}

	if err := s.UpdateTrip(id, map[string]interface{}{"coordinates": nil}); err != nil {
		t.Fatalf("UpdateTrip() error = %v", err)
	}

	got, err := s.GetTrip(id)
	if err != nil {
		t.Fatalf("GetTrip() error = %v", err)
	}
	if got.Coordinates != nil {
		t.Fatalf("expected coordinates to be cleared, got %+v", *got.Coordinates)
	}
}

// TestMutateLocationsConcurrent ensures concurrent location mutations are
// serialized: every append must survive, with no lost updates.
func TestMutateLocationsConcurrent(t *testing.T) {
	s := newTestStorage(t, false)

	id, err := s.AddTrip(Trip{
		Name:      "Lisbon",
		StartDate: "2026-05-10",
		EndDate:   "2026-05-15",
		Locations: []Location{},
	})
	if err != nil {
		t.Fatalf("AddTrip() error = %v", err)
	}

	const n = 25
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := s.MutateLocations(id, func(current []Location) ([]Location, error) {
				return append(current, Location{
					ID:   fmt.Sprintf("loc-%d", i),
					Name: fmt.Sprintf("L%d", i),
				}), nil
			})
			if err != nil {
				t.Errorf("MutateLocations() error = %v", err)
			}
		}(i)
	}
	wg.Wait()

	got, err := s.GetTrip(id)
	if err != nil {
		t.Fatalf("GetTrip() error = %v", err)
	}
	if len(got.Locations) != n {
		t.Fatalf("expected %d locations after concurrent appends, got %d", n, len(got.Locations))
	}
}

// TestMutateLocationsTripNotFound checks the missing-trip signal callers rely on.
func TestMutateLocationsTripNotFound(t *testing.T) {
	s := newTestStorage(t, false)

	err := s.MutateLocations(99999, func(current []Location) ([]Location, error) {
		return current, nil
	})
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows for missing trip, got %v", err)
	}
}

// TestMutateLocationsCallbackError propagates a callback error without writing.
func TestMutateLocationsCallbackError(t *testing.T) {
	s := newTestStorage(t, false)

	id, err := s.AddTrip(Trip{
		Name:      "Madrid",
		StartDate: "2026-04-01",
		EndDate:   "2026-04-03",
		Locations: []Location{{ID: "a", Name: "Prado"}},
	})
	if err != nil {
		t.Fatalf("AddTrip() error = %v", err)
	}

	sentinel := fmt.Errorf("nope")
	err = s.MutateLocations(id, func(current []Location) ([]Location, error) {
		return nil, sentinel
	})
	if err != sentinel {
		t.Fatalf("expected callback error to propagate, got %v", err)
	}

	got, err := s.GetTrip(id)
	if err != nil {
		t.Fatalf("GetTrip() error = %v", err)
	}
	if len(got.Locations) != 1 {
		t.Fatalf("expected locations unchanged after callback error, got %d", len(got.Locations))
	}
}
