package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

// Coordinate matches the {lat, lng} structure
type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Location matches the Location interface
type Location struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Coordinates Coordinate `json:"coordinates"`
	Notes       string     `json:"notes,omitempty"`
	Date        string     `json:"date,omitempty"` // Use string to match TS date format
}

// Trip defines the structure for our travel objects, matching the TS interface closely.
// NOTE: Go uses int64 for the primary key internally, but the exported struct uses string.
type Trip struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	StartDate   string      `json:"startDate"` // Use string to match TS date format
	EndDate     string      `json:"endDate"`   // Use string to match TS date format
	Locations   []Location  `json:"locations"`
	Color       string      `json:"color"`
	Coordinates *Coordinate `json:"coordinates,omitempty"` // Pointer for optional
	Notes       *string     `json:"notes,omitempty"`       // Pointer for optional
}

// Storage holds the database connection and methods for CRUD operations.
type Storage struct {
	db *sql.DB
}

const dbPath = "./travelog.db"

// NewStorage initializes the database and returns a new Storage instance.
func NewStorage() (*Storage, error) {
	if err := initDB(); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	return &Storage{db: db}, nil
}

// Close closes the database connection.
func (s *Storage) Close() error {
	return s.db.Close()
}

// initDB ensures the database file and table exist with the new schema.
func initDB() error {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("could not create directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	// Updated schema to include new fields and JSON text columns for complex objects
	sqlStmt := `
	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		start_date TEXT,
		end_date TEXT,
		color TEXT,
		notes TEXT,
		coordinates_json TEXT,
		locations_json TEXT
	);`

	_, err = db.Exec(sqlStmt)
	return err
}

// GetTrips retrieves all trips from the database.
func (s *Storage) GetTrips() ([]Trip, error) {
	rows, err := s.db.Query("SELECT id, name, start_date, end_date, color, notes, coordinates_json, locations_json FROM trips")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trips []Trip
	for rows.Next() {
		trip, err := s.scanTrip(rows)
		if err != nil {
			return nil, err
		}
		trips = append(trips, trip)
	}
	return trips, rows.Err()
}

// GetTrip retrieves a single trip by ID.
func (s *Storage) GetTrip(id int64) (Trip, error) {
	row := s.db.QueryRow("SELECT id, name, start_date, end_date, color, notes, coordinates_json, locations_json FROM trips WHERE id = ?", id)
	return s.scanTrip(row)
}

// AddTrip inserts a new trip into the database.
func (s *Storage) AddTrip(t Trip) (int64, error) {
	// 1. Marshal complex structs to JSON strings
	locationsJSON, err := json.Marshal(t.Locations)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal locations: %w", err)
	}

	var coordinatesJSON []byte
	if t.Coordinates != nil {
		coordinatesJSON, err = json.Marshal(t.Coordinates)
		if err != nil {
			return 0, fmt.Errorf("failed to marshal coordinates: %w", err)
		}
	}

	var notesVal string
	if t.Notes != nil {
		notesVal = *t.Notes
	}

	// 2. Execute insert
	res, err := s.db.Exec(`
		INSERT INTO trips (name, start_date, end_date, color, notes, coordinates_json, locations_json) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.StartDate, t.EndDate, t.Color, notesVal, coordinatesJSON, locationsJSON)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateTrip updates specific fields of an existing trip.
// For simplicity, this only updates top-level string/numeric fields, not complex JSON objects.
// A full implementation would handle JSON updates.
func (s *Storage) UpdateTrip(id int64, updates map[string]interface{}) error {
	setClauses := []string{}
	args := []interface{}{}

	for key, val := range updates {
		log.Printf("Updating field %s to value %v", key, val)
		// Only allow updating whitelisted fields
		switch key {
		case "name", "startDate", "endDate", "color":
			setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
			args = append(args, val)
		case "notes":
			setClauses = append(setClauses, "notes = ?")
			args = append(args, val)
		// For complex objects, re-marshal them if present in updates
		case "locations":
			jsonBytes, err := json.Marshal(val)
			if err != nil {
				return fmt.Errorf("failed to marshal locations for update: %w", err)
			}
			setClauses = append(setClauses, "locations_json = ?")
			args = append(args, string(jsonBytes))
		case "coordinates":
			if coordsMap, ok := val.(Coordinate); ok {
				jsonBytes, err := json.Marshal(coordsMap)
				if err != nil {
					return fmt.Errorf("failed to marshal coordinates for update: %w", err)
				}
				setClauses = append(setClauses, "coordinates_json = ?")
				args = append(args, string(jsonBytes))
			}
		}
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields provided for update")
	}

	stmt := fmt.Sprintf("UPDATE trips SET %s WHERE id = ?", strings.Join(setClauses, ", "))
	args = append(args, id)

	res, err := s.db.Exec(stmt, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows // Indicate that no row was found to update
	}
	return nil
}

// DeleteTrip removes a trip by ID.
func (s *Storage) DeleteTrip(id int64) error {
	res, err := s.db.Exec("DELETE FROM trips WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// scanTrip is a helper function to read a row/single result into a Trip struct,
// including unmarshaling the JSON fields.
func (s *Storage) scanTrip(scanner interface {
	Scan(dest ...interface{}) error
}) (Trip, error) {
	var t Trip
	var dbID int64
	var notes sql.NullString
	var coordinatesJSON, locationsJSON string

	err := scanner.Scan(
		&dbID, &t.Name, &t.StartDate, &t.EndDate, &t.Color, &notes, &coordinatesJSON, &locationsJSON,
	)
	if err != nil {
		return Trip{}, err
	}

	// Convert DB ID to string for the frontend struct
	t.ID = fmt.Sprintf("%d", dbID)

	// Unmarshal Locations
	if locationsJSON != "" {
		if err := json.Unmarshal([]byte(locationsJSON), &t.Locations); err != nil {
			return Trip{}, fmt.Errorf("failed to unmarshal locations: %w", err)
		}
	} else {
		t.Locations = []Location{} // Ensure it's not nil if empty
	}

	// Unmarshal Coordinates (optional)
	if coordinatesJSON != "" {
		var coords Coordinate
		if err := json.Unmarshal([]byte(coordinatesJSON), &coords); err != nil {
			return Trip{}, fmt.Errorf("failed to unmarshal coordinates: %w", err)
		}
		t.Coordinates = &coords
	}

	// Handle optional Notes field
	if notes.Valid {
		t.Notes = &notes.String
	}

	return t, nil
}
