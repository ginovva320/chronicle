package trip

import (
	"fmt"
	"strings"
	"time"

	"anid.dev/chronicle/internal/storage"
)

const dateLayout = "2006-01-02"

func validateTripCreate(t *storage.Trip) map[string]string {
	errs := map[string]string{}

	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" {
		errs["name"] = "name is required"
	}

	if _, ok := parseDate(t.StartDate); !ok {
		errs["startDate"] = "startDate must be in YYYY-MM-DD format"
	}
	if _, ok := parseDate(t.EndDate); !ok {
		errs["endDate"] = "endDate must be in YYYY-MM-DD format"
	}

	if start, ok := parseDate(t.StartDate); ok {
		if end, ok := parseDate(t.EndDate); ok && end.Before(start) {
			errs["endDate"] = "endDate must be on or after startDate"
		}
	}

	if t.Coordinates != nil {
		if t.Coordinates.Lat < -90 || t.Coordinates.Lat > 90 {
			errs["coordinates.lat"] = "latitude must be between -90 and 90"
		}
		if t.Coordinates.Lng < -180 || t.Coordinates.Lng > 180 {
			errs["coordinates.lng"] = "longitude must be between -180 and 180"
		}
	}

	validateLocations(errs, t.Locations)

	if len(errs) == 0 {
		return nil
	}
	return errs
}

func validateTripUpdates(updates map[string]interface{}) map[string]string {
	errs := map[string]string{}
	if len(updates) == 0 {
		return map[string]string{"body": "at least one field is required"}
	}

	allowed := map[string]bool{
		"name": true, "startDate": true, "endDate": true, "color": true,
		"notes": true, "locations": true, "coordinates": true,
	}

	for key := range updates {
		if !allowed[key] {
			errs[key] = "unsupported field"
		}
	}

	if name, ok := updates["name"]; ok {
		value, isString := name.(string)
		if !isString || strings.TrimSpace(value) == "" {
			errs["name"] = "name must be a non-empty string"
		}
	}

	if startRaw, ok := updates["startDate"]; ok {
		startStr, isString := startRaw.(string)
		if !isString {
			errs["startDate"] = "startDate must be a string in YYYY-MM-DD format"
		} else if _, ok := parseDate(startStr); !ok {
			errs["startDate"] = "startDate must be in YYYY-MM-DD format"
		}
	}

	if endRaw, ok := updates["endDate"]; ok {
		endStr, isString := endRaw.(string)
		if !isString {
			errs["endDate"] = "endDate must be a string in YYYY-MM-DD format"
		} else if _, ok := parseDate(endStr); !ok {
			errs["endDate"] = "endDate must be in YYYY-MM-DD format"
		}
	}

	if startRaw, startOk := updates["startDate"]; startOk {
		if endRaw, endOk := updates["endDate"]; endOk {
			startStr, startIsString := startRaw.(string)
			endStr, endIsString := endRaw.(string)
			if startIsString && endIsString {
				if startDate, ok := parseDate(startStr); ok {
					if endDate, ok := parseDate(endStr); ok && endDate.Before(startDate) {
						errs["endDate"] = "endDate must be on or after startDate"
					}
				}
			}
		}
	}

	if coordinatesRaw, ok := updates["coordinates"]; ok {
		if coordinatesRaw == nil {
			// nil is allowed to clear coordinates
		} else {
			coordsMap, mapOk := coordinatesRaw.(map[string]interface{})
			if !mapOk {
				errs["coordinates"] = "coordinates must be an object with lat and lng"
			} else {
				lat, latOk := asFloat64(coordsMap["lat"])
				if !latOk {
					errs["coordinates.lat"] = "lat must be a number"
				} else if lat < -90 || lat > 90 {
					errs["coordinates.lat"] = "latitude must be between -90 and 90"
				}
				lng, lngOk := asFloat64(coordsMap["lng"])
				if !lngOk {
					errs["coordinates.lng"] = "lng must be a number"
				} else if lng < -180 || lng > 180 {
					errs["coordinates.lng"] = "longitude must be between -180 and 180"
				}
			}
		}
	}

	if locationsRaw, ok := updates["locations"]; ok {
		locationsSlice, sliceOK := locationsRaw.([]interface{})
		if !sliceOK {
			errs["locations"] = "locations must be an array"
		} else {
			for idx, raw := range locationsSlice {
				locMap, mapOK := raw.(map[string]interface{})
				if !mapOK {
					errs[fmt.Sprintf("locations[%d]", idx)] = "location must be an object"
					continue
				}
				validateLocationMap(errs, idx, locMap)
			}
		}
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

func validateLocations(errs map[string]string, locations []storage.Location) {
	for i, loc := range locations {
		if strings.TrimSpace(loc.ID) == "" {
			errs[fmt.Sprintf("locations[%d].id", i)] = "id is required"
		}
		if strings.TrimSpace(loc.Name) == "" {
			errs[fmt.Sprintf("locations[%d].name", i)] = "name is required"
		}
		if loc.Coordinates.Lat < -90 || loc.Coordinates.Lat > 90 {
			errs[fmt.Sprintf("locations[%d].coordinates.lat", i)] = "latitude must be between -90 and 90"
		}
		if loc.Coordinates.Lng < -180 || loc.Coordinates.Lng > 180 {
			errs[fmt.Sprintf("locations[%d].coordinates.lng", i)] = "longitude must be between -180 and 180"
		}
		if loc.Date != "" {
			if _, ok := parseDate(loc.Date); !ok {
				errs[fmt.Sprintf("locations[%d].date", i)] = "date must be in YYYY-MM-DD format"
			}
		}
	}
}

func validateLocationMap(errs map[string]string, idx int, locMap map[string]interface{}) {
	id, idOK := locMap["id"].(string)
	if !idOK || strings.TrimSpace(id) == "" {
		errs[fmt.Sprintf("locations[%d].id", idx)] = "id is required"
	}
	name, nameOK := locMap["name"].(string)
	if !nameOK || strings.TrimSpace(name) == "" {
		errs[fmt.Sprintf("locations[%d].name", idx)] = "name is required"
	}

	coordsRaw, coordsOK := locMap["coordinates"]
	if !coordsOK {
		errs[fmt.Sprintf("locations[%d].coordinates", idx)] = "coordinates are required"
		return
	}
	coordsMap, coordsIsMap := coordsRaw.(map[string]interface{})
	if !coordsIsMap {
		errs[fmt.Sprintf("locations[%d].coordinates", idx)] = "coordinates must be an object"
		return
	}

	lat, latOK := asFloat64(coordsMap["lat"])
	if !latOK {
		errs[fmt.Sprintf("locations[%d].coordinates.lat", idx)] = "lat must be a number"
	} else if lat < -90 || lat > 90 {
		errs[fmt.Sprintf("locations[%d].coordinates.lat", idx)] = "latitude must be between -90 and 90"
	}

	lng, lngOK := asFloat64(coordsMap["lng"])
	if !lngOK {
		errs[fmt.Sprintf("locations[%d].coordinates.lng", idx)] = "lng must be a number"
	} else if lng < -180 || lng > 180 {
		errs[fmt.Sprintf("locations[%d].coordinates.lng", idx)] = "longitude must be between -180 and 180"
	}

	if dateRaw, exists := locMap["date"]; exists && dateRaw != nil {
		dateStr, ok := dateRaw.(string)
		if !ok || dateStr == "" {
			errs[fmt.Sprintf("locations[%d].date", idx)] = "date must be a non-empty YYYY-MM-DD string"
		} else if _, ok := parseDate(dateStr); !ok {
			errs[fmt.Sprintf("locations[%d].date", idx)] = "date must be in YYYY-MM-DD format"
		}
	}
}

func parseDate(value string) (time.Time, bool) {
	date, err := time.Parse(dateLayout, value)
	if err != nil {
		return time.Time{}, false
	}
	return date, true
}

func asFloat64(value interface{}) (float64, bool) {
	number, ok := value.(float64)
	return number, ok
}
