# 🗺️ Travelog

A sleek, modern travel tracking app built with React, TypeScript, and Google Maps. Track your adventures with beautiful visualizations and an intuitive interface.

## ✨ Features

- 📍 Create and manage trips with start/end dates
- 🗺️ Interactive Google Maps integration
- 📝 Add locations with names, coordinates, and notes
- 🎨 Sleek, minimalistic design with vibrant colors
- 💾 SQLite-backed backend API for data persistence
- 📱 Fully responsive design
- ✨ Smooth animations and transitions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Go (v1.24 or higher)
- A Google Maps API key

### Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API (required for location search)
4. Create credentials (API Key)
5. Copy your API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your Google Maps API key to the `.env` file:
```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Run locally

Use one command to run both services:

```bash
npm run dev:stack
```

This starts:
- Frontend Vite dev server: `http://localhost:5173`
- Go backend/API server: `http://localhost:8572`

You can also run each side separately:

```bash
npm run dev:web   # frontend only
npm run dev:api   # backend only
```

`dev:api` sets `CHRONICLE_SEED=true`, so seed data is inserted only when the database is empty.

### Useful Developer Commands

```bash
npm run test:api      # run Go tests
npm run check         # lint + Go tests
npm run db:reset      # delete local SQLite db (keeps code/state clean)
npm run hooks:install # install local pre-commit hook (lint + go test)
```

## 🧪 Production Build

```bash
npm run build
go run main.go
```

For production-like runs, seed data is off by default unless `CHRONICLE_SEED=true` is explicitly set.

## 🏗️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Go** - Backend server and API
- **SQLite** - Persistent storage
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Google Maps (@vis.gl/react-google-maps)** - Map integration
- **date-fns** - Date formatting
- **lucide-react** - Icons

## 🔌 Backend API

Base path: `/api/trips`

- `GET /api/trips` — list all trips
- `POST /api/trips` — create a trip
- `GET /api/trips/:id` — fetch one trip
- `PATCH /api/trips/:id` — update trip fields
- `DELETE /api/trips/:id` — remove a trip

Notes:
- `:id` is a numeric SQLite primary key serialized as a string in API responses.
- Request validation returns `{"error":"validation_failed","details":{...}}` for invalid payloads.
- OpenAPI contract: `docs/openapi.yaml`

## 💾 Database

- Default DB path: `./travelog.db`
- Override path with `CHRONICLE_DB_PATH`
- Schema is versioned via `schema_migrations` table
- `travelog.db` is intentionally gitignored and should not be committed

## 🐳 Docker Self-Hosting

Build image locally:

```bash
docker build \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here \
  -t travelog:latest .
```

Run with persistent SQLite storage:

```bash
mkdir -p ./data
docker run -d \
  --name travelog \
  -p 8572:8572 \
  -v "$(pwd)/data:/data" \
  -e CHRONICLE_DB_PATH=/data/travelog.db \
  -e CHRONICLE_SEED=false \
  travelog:latest
```

The app is served at `http://localhost:8572`.

## 📦 GHCR CI/CD

Workflow file: `.github/workflows/ghcr.yml`

What it does:
- On PR: run lint, Go tests, and frontend build
- On push to `main`/`master` (or version tags): build and push Docker image to GHCR
- Image name: `ghcr.io/<owner>/<repo>`
- Tags: `latest` (default branch), `sha-<commit>`, and release tags

Required repository secrets:
- `VITE_GOOGLE_MAPS_API_KEY` (used at Docker build time for frontend bundle)

Package visibility:
- GHCR supports private images.
- If your GitHub repo is private, GHCR package is typically private by default.
- You can explicitly set package visibility in GitHub: `Package -> Package settings -> Change visibility`.

## 📝 License

MIT
