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

## 🧪 Production Build

```bash
npm run build
go run main.go
```

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

Database file: `travelog.db`.

## 📝 License

MIT
