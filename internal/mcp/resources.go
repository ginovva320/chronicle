package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
)

// MCP resources are read-only, URI-addressable views of the same trip data the
// tools expose. They let a client attach a trip as reference context without
// invoking a tool. URIs live under the `travelog://` scheme:
//
//	travelog://trips           → array of every trip
//	travelog://trips/{tripId}  → a single trip with its locations

const jsonMime = "application/json"

const resourceScheme = "travelog://"

type resourceListEntry struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	MimeType    string `json:"mimeType"`
}

type resourceTemplateEntry struct {
	URITemplate string `json:"uriTemplate"`
	Name        string `json:"name"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	MimeType    string `json:"mimeType"`
}

type resourceContents struct {
	URI      string `json:"uri"`
	MimeType string `json:"mimeType"`
	Text     string `json:"text"`
}

func listResources(store Storage) ([]resourceListEntry, error) {
	trips, err := store.GetTrips()
	if err != nil {
		return nil, err
	}
	entries := []resourceListEntry{
		{
			URI:         "travelog://trips",
			Name:        "trips",
			Title:       "All trips",
			Description: "Index of every trip with its locations.",
			MimeType:    jsonMime,
		},
	}
	for _, t := range trips {
		entries = append(entries, resourceListEntry{
			URI:         "travelog://trips/" + t.ID,
			Name:        t.ID,
			Title:       t.Name,
			Description: fmt.Sprintf("%s → %s. Returns the trip with all locations.", t.StartDate, t.EndDate),
			MimeType:    jsonMime,
		})
	}
	return entries, nil
}

func listResourceTemplates() []resourceTemplateEntry {
	return []resourceTemplateEntry{
		{
			URITemplate: "travelog://trips/{tripId}",
			Name:        "trip",
			Title:       "Trip by id",
			Description: "Fetch a single trip and all of its locations.",
			MimeType:    jsonMime,
		},
	}
}

func readResource(store Storage, uri string) (resourceContents, error) {
	if !strings.HasPrefix(uri, resourceScheme) {
		return resourceContents{}, fmt.Errorf("unsupported resource uri: %s", uri)
	}
	path := strings.TrimPrefix(uri, resourceScheme)

	if path == "trips" || path == "trips/" {
		trips, err := store.GetTrips()
		if err != nil {
			return resourceContents{}, err
		}
		return jsonContents(uri, trips)
	}

	if rest, ok := strings.CutPrefix(path, "trips/"); ok && rest != "" && !strings.Contains(rest, "/") {
		t, err := getTripByID(store, rest)
		if err != nil {
			return resourceContents{}, err
		}
		return jsonContents(uri, t)
	}

	return resourceContents{}, fmt.Errorf("unsupported resource uri: %s", uri)
}

func jsonContents(uri string, value any) (resourceContents, error) {
	b, err := json.Marshal(value)
	if err != nil {
		return resourceContents{}, err
	}
	return resourceContents{URI: uri, MimeType: jsonMime, Text: string(b)}, nil
}
