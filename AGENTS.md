# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot

- App: Travelog (trip and location tracking with maps)
- Frontend: React + TypeScript + Vite
- Backend: Go HTTP API
- Persistence: SQLite (`travelog.db`, ignored in git)

## Run And Build

```bash
# Run frontend + backend together
npm run dev:stack

# Frontend only
npm run dev:web

# Backend only
npm run dev:api

# Frontend production build
npm run build

# Backend run (serves dist in prod mode)
go run main.go

# Go compile/test check
GOCACHE=/tmp/go-build go test ./...
```

## Environment

Required in `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Google APIs needed:
- Maps JavaScript API
- Places API

## Architecture

### Frontend Routing

- `/` trip list
- `/trip/new` create trip
- `/trip/:id` trip details
- `/trip/:id/edit` edit trip
- `/trip/:tripId/location/new` add location
- `/trip/:tripId/location/:locationId/edit` edit location

### Backend API

Base path: `/api/trips`

- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:id`
- `PATCH /api/trips/:id`
- `DELETE /api/trips/:id`

Trip IDs are numeric in SQLite and serialized as strings in API responses.

## Data Model Notes

- `Trip` has: `id`, `name`, `startDate`, `endDate`, `locations`, `color`, optional `coordinates`, optional `notes`.
- `Location` has: `id`, `name`, `coordinates`, optional `notes`, optional `date`.
- Complex fields (`coordinates`, `locations`) are stored as JSON text in SQLite.

## Seeding Behavior

- Seed data is defined in `internal/storage/seed.go`.
- Seeding runs during DB init only when `trips` table is empty.
- Seed trip names are normalized without the `" Trip"` suffix.

## Implementation Conventions

- Use `src/services/storage.ts` for frontend API access.
- Keep trip/location date strings in `YYYY-MM-DD` format.
- Keep map marker visuals tied to trip color where applicable.
- Prefer updating nested locations through `StorageService.updateTrip(id, { locations })`.

## File And Git Hygiene

- Do not commit `travelog.db`.
- Keep API/DB changes in Go files under `internal/`.
- Keep UI/component changes in `src/`.
