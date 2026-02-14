package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

const defaultSeedFilePath = "./seed/trips.seed.example.json"

func seedTripsIfEmpty(db *sql.DB) error {
	var tripCount int
	if err := db.QueryRow("SELECT COUNT(1) FROM trips").Scan(&tripCount); err != nil {
		return err
	}
	if tripCount > 0 {
		return nil
	}

	trips, err := loadSeedTrips(seedFilePath())
	if err != nil {
		return err
	}
	if len(trips) == 0 {
		return nil
	}

	store := &Storage{db: db}
	for _, trip := range trips {
		if trip.Locations == nil {
			trip.Locations = []Location{}
		}
		if _, err := store.AddTrip(trip); err != nil {
			return err
		}
	}

	return nil
}

func loadSeedTrips(path string) ([]Trip, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read seed file %q: %w", path, err)
	}

	var trips []Trip
	if err := json.Unmarshal(contents, &trips); err != nil {
		return nil, fmt.Errorf("failed to parse seed file %q: %w", path, err)
	}

	return trips, nil
}

func seedFilePath() string {
	path := strings.TrimSpace(os.Getenv("CHRONICLE_SEED_FILE"))
	if path == "" {
		return defaultSeedFilePath
	}
	return path
}
