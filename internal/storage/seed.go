package storage

import "database/sql"

var initialTrips = []Trip{
	{Name: "Chicago", StartDate: "2016-11-23", EndDate: "2016-11-26", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 41.8781, Lng: -87.6298}},
	{Name: "Paris", StartDate: "2017-05-26", EndDate: "2017-06-09", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 48.8566, Lng: 2.3522}},
	{Name: "Chicago", StartDate: "2017-07-03", EndDate: "2017-07-10", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 41.8781, Lng: -87.6298}},
	{Name: "Austin", StartDate: "2017-08-27", EndDate: "2017-08-31", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 30.2672, Lng: -97.7431}},
	{Name: "Tokyo", StartDate: "2017-11-15", EndDate: "2017-11-25", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 35.6895, Lng: 139.692}},
	{Name: "San Jose", StartDate: "2018-02-17", EndDate: "2018-02-19", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.3382, Lng: -121.886}},
	{Name: "San Jose", StartDate: "2018-06-08", EndDate: "2018-06-10", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.3382, Lng: -121.886}},
	{Name: "Chicago", StartDate: "2018-07-11", EndDate: "2018-11-01", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 41.8781, Lng: -87.6298}},
	{Name: "San Francisco", StartDate: "2019-05-31", EndDate: "2019-06-03", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Seattle", StartDate: "2019-09-14", EndDate: "2019-09-17", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "San Francisco", StartDate: "2019-12-11", EndDate: "2019-12-15", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "New York", StartDate: "2020-01-08", EndDate: "2020-01-13", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 40.7128, Lng: -74.006}},
	{Name: "San Francisco", StartDate: "2020-02-05", EndDate: "2020-02-07", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "San Francisco", StartDate: "2020-02-23", EndDate: "2020-02-24", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "San Francisco", StartDate: "2020-03-25", EndDate: "2020-03-27", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "San Francisco", StartDate: "2021-10-12", EndDate: "2021-10-15", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Seattle", StartDate: "2021-10-29", EndDate: "2021-10-29", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "San Francisco", StartDate: "2022-07-26", EndDate: "2022-07-26", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "San Francisco", StartDate: "2022-09-27", EndDate: "2022-09-29", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Austin", StartDate: "2023-02-02", EndDate: "2023-02-03", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 30.2672, Lng: -97.7431}},
	{Name: "San Francisco", StartDate: "2023-02-13", EndDate: "2023-02-15", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Denver", StartDate: "2023-03-02", EndDate: "2023-03-06", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 39.7392, Lng: -104.99}},
	{Name: "Seattle", StartDate: "2023-05-30", EndDate: "2023-06-02", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "San Francisco", StartDate: "2023-09-26", EndDate: "2023-09-28", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Las Vegas", StartDate: "2023-10-19", EndDate: "2023-10-22", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 36.1699, Lng: -115.14}},
	{Name: "Tokyo", StartDate: "2023-11-16", EndDate: "2023-11-24", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 35.6895, Lng: 139.692}},
	{Name: "Salt Lake City", StartDate: "2024-02-03", EndDate: "2024-02-06", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 40.7608, Lng: -111.891}},
	{Name: "Las Vegas", StartDate: "2024-03-07", EndDate: "2024-03-12", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 36.1699, Lng: -115.14}},
	{Name: "San Jose del Cabo", StartDate: "2024-03-13", EndDate: "2024-03-16", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 23.064, Lng: -109.684}},
	{Name: "Miami", StartDate: "2024-04-12", EndDate: "2024-04-21", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 25.7617, Lng: -80.1918}},
	{Name: "San Francisco", StartDate: "2024-04-29", EndDate: "2024-05-02", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "New York", StartDate: "2024-06-19", EndDate: "2024-06-23", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 40.7128, Lng: -74.006}},
	{Name: "Vancouver", StartDate: "2024-07-11", EndDate: "2024-07-14", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 49.194, Lng: -123.184}},
	{Name: "Austin", StartDate: "2024-10-17", EndDate: "2024-10-22", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 30.2672, Lng: -97.7431}},
	{Name: "Seattle", StartDate: "2024-11-08", EndDate: "2024-11-11", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "Singapore", StartDate: "2024-12-17", EndDate: "2024-12-27", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 1.3502, Lng: 103.994}},
	{Name: "Tokyo", StartDate: "2025-01-26", EndDate: "2025-02-05", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 35.6895, Lng: 139.692}},
	{Name: "San Jose", StartDate: "2025-06-04", EndDate: "2025-06-08", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.3382, Lng: -121.886}},
	{Name: "Seattle", StartDate: "2025-06-13", EndDate: "2025-06-15", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "San Francisco", StartDate: "2025-07-19", EndDate: "2025-07-24", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Austin", StartDate: "2025-10-09", EndDate: "2025-10-13", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 30.2672, Lng: -97.7431}},
	{Name: "San Francisco", StartDate: "2025-10-28", EndDate: "2025-10-30", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 37.7749, Lng: -122.419}},
	{Name: "Las Vegas", StartDate: "2025-11-20", EndDate: "2025-11-23", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 36.1699, Lng: -115.14}},
	{Name: "Seattle", StartDate: "2025-11-27", EndDate: "2025-12-01", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 47.6062, Lng: -122.332}},
	{Name: "London", StartDate: "2025-12-24", EndDate: "2026-01-01", Locations: []Location{}, Color: "", Coordinates: &Coordinate{Lat: 51.47, Lng: -0.4543}},
}

func seedTripsIfEmpty(db *sql.DB) error {
	var tripCount int
	if err := db.QueryRow("SELECT COUNT(1) FROM trips").Scan(&tripCount); err != nil {
		return err
	}
	if tripCount > 0 {
		return nil
	}

	store := &Storage{db: db}
	for _, trip := range initialTrips {
		if _, err := store.AddTrip(trip); err != nil {
			return err
		}
	}

	return nil
}
