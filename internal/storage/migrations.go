package storage

import (
	"database/sql"
	"fmt"
)

type migration struct {
	version int
	name    string
	sql     string
}

var migrations = []migration{
	{
		version: 1,
		name:    "create_trips_table",
		sql: `
		CREATE TABLE IF NOT EXISTS trips (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			start_date TEXT,
			end_date TEXT,
			color TEXT,
			notes TEXT,
			coordinates_json TEXT,
			locations_json TEXT
		);`,
	},
	{
		version: 2,
		name:    "create_trips_start_date_index",
		sql:     `CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);`,
	},
}

func runMigrations(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`); err != nil {
		return fmt.Errorf("failed to ensure schema_migrations table: %w", err)
	}

	for _, m := range migrations {
		var exists int
		if err = tx.QueryRow("SELECT COUNT(1) FROM schema_migrations WHERE version = ?", m.version).Scan(&exists); err != nil {
			return fmt.Errorf("failed to check migration %d state: %w", m.version, err)
		}
		if exists > 0 {
			continue
		}

		if _, err = tx.Exec(m.sql); err != nil {
			return fmt.Errorf("failed to apply migration %d (%s): %w", m.version, m.name, err)
		}
		if _, err = tx.Exec("INSERT INTO schema_migrations (version, name) VALUES (?, ?)", m.version, m.name); err != nil {
			return fmt.Errorf("failed to record migration %d (%s): %w", m.version, m.name, err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migrations: %w", err)
	}

	return nil
}
