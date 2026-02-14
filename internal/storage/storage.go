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

const defaultDBPath = "./travelog.db"

// Coordinate matches the {lat, lng} structure
// used by the frontend.
type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Location matches the frontend location schema.
type Location struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Coordinates Coordinate `json:"coordinates"`
	Notes       string     `json:"notes,omitempty"`
	Date        string     `json:"date,omitempty"`
}

// Trip matches the frontend trip schema.
// Internally, SQLite IDs are numeric and serialized back as strings.
type Trip struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	StartDate   string      `json:"startDate"`
	EndDate     string      `json:"endDate"`
	Locations   []Location  `json:"locations"`
	Color       string      `json:"color"`
	Coordinates *Coordinate `json:"coordinates,omitempty"`
	Notes       *string     `json:"notes,omitempty"`
}

// Storage holds the database connection and methods for CRUD operations.
type Storage struct {
	db *sql.DB
}

// NewStorage initializes the database, applies migrations, and optionally seeds data.
func NewStorage() (*Storage, error) {
	dbPath := databasePath()

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("could not create database directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := runMigrations(db); err != nil {
		_ = db.Close()
		return nil, err
	}

	if shouldSeed() {
		if err := seedTripsIfEmpty(db); err != nil {
			_ = db.Close()
			return nil, err
		}
	}

	return &Storage{db: db}, nil
}

func databasePath() string {
	path := strings.TrimSpace(os.Getenv("CHRONICLE_DB_PATH"))
	if path == "" {
		return defaultDBPath
	}
	return path
}

func shouldSeed() bool {
	seed := strings.ToLower(strings.TrimSpace(os.Getenv("CHRONICLE_SEED")))
	switch seed {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

// Close closes the database connection.
func (s *Storage) Close() error {
	return s.db.Close()
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
func (s *Storage) UpdateTrip(id int64, updates map[string]interface{}) error {
	setClauses := []string{}
	args := []interface{}{}

	columnMap := map[string]string{
		"name":      "name",
		"startDate": "start_date",
		"endDate":   "end_date",
		"color":     "color",
	}

	for key, val := range updates {
		log.Printf("Updating field %s to value %v", key, val)
		switch key {
		case "name", "startDate", "endDate", "color":
			setClauses = append(setClauses, fmt.Sprintf("%s = ?", columnMap[key]))
			args = append(args, val)
		case "notes":
			setClauses = append(setClauses, "notes = ?")
			args = append(args, val)
		case "locations":
			jsonBytes, err := json.Marshal(val)
			if err != nil {
				return fmt.Errorf("failed to marshal locations for update: %w", err)
			}
			setClauses = append(setClauses, "locations_json = ?")
			args = append(args, string(jsonBytes))
		case "coordinates":
			jsonBytes, err := json.Marshal(val)
			if err != nil {
				return fmt.Errorf("failed to marshal coordinates for update: %w", err)
			}
			setClauses = append(setClauses, "coordinates_json = ?")
			args = append(args, string(jsonBytes))
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
		return sql.ErrNoRows
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

// scanTrip reads a row into Trip and unmarshals JSON columns.
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

	t.ID = fmt.Sprintf("%d", dbID)

	if locationsJSON != "" {
		if err := json.Unmarshal([]byte(locationsJSON), &t.Locations); err != nil {
			return Trip{}, fmt.Errorf("failed to unmarshal locations: %w", err)
		}
	} else {
		t.Locations = []Location{}
	}

	if coordinatesJSON != "" {
		var coords Coordinate
		if err := json.Unmarshal([]byte(coordinatesJSON), &coords); err != nil {
			return Trip{}, fmt.Errorf("failed to unmarshal coordinates: %w", err)
		}
		t.Coordinates = &coords
	}

	if notes.Valid {
		t.Notes = &notes.String
	}

	return t, nil
}
