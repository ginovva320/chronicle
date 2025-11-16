# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Travelog is a travel tracking app built with React, TypeScript, and Google Maps. Users create trips with locations displayed on interactive maps. Data persists in localStorage via an abstracted storage layer.

## Development Commands

```bash
# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Lint codebase
npm run lint

# Preview production build
npm preview
```

## Environment Setup

Required environment variable in `.env`:
```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Google Maps APIs required:
- Maps JavaScript API
- Places API (for location autocomplete)

## Architecture

### Routing Structure

The app uses a nested resource pattern:

- `/` - Trip list (home)
- `/trip/new` - Create trip
- `/trip/:id` - View trip details with map
- `/trip/:id/edit` - Edit trip (reuses TripForm)
- `/trip/:tripId/location/new` - Add location to trip
- `/trip/:tripId/location/:locationId/edit` - Edit location

**Key Pattern**: Both TripForm and LocationForm are standalone pages (not modals) to avoid Google Places Autocomplete z-index conflicts with Dialog components.

### Data Model

Two main entities with a parent-child relationship:

**Trip** (parent):
- Has optional `coordinates` (lat/lng) for the trip's primary location
- Has a `color` field used for visual distinction (accent strips, map markers)
- Contains array of `locations`

**Location** (child):
- Always has required `coordinates`
- Belongs to a single trip
- Has optional `date` and `notes`

The trip's `color` is randomly assigned on creation via `getRandomColor()` in `src/lib/utils.ts`.

### Storage Layer

All data operations go through `src/services/storage.ts` (StorageService class):
- Abstracts localStorage implementation
- Single source of truth: `travelog_trips` key
- Designed for easy migration to API backend - just replace localStorage calls with fetch

**Critical**: To update a trip's locations, use `StorageService.updateTrip(tripId, { locations: newLocationsArray })`. The locations array is nested within the trip object.

### Google Maps Integration

Maps use `@vis.gl/react-google-maps` library with two key patterns:

1. **Map Bounds Fitting**: Both TripList and TripDetail use `useEffect` with `map.fitBounds()` to automatically zoom to show all markers. This ensures all pins are visible on load.

2. **Autocomplete Setup**: TripForm and LocationForm both use Google Places Autocomplete:
   - Load with `useMapsLibrary('places')`
   - Attach to input ref with `places.Autocomplete`
   - Auto-populate name and coordinates on place selection
   - Must wrap components in `<APIProvider>` with API key

3. **Marker Colors**: Map pins use the trip's `color` field via inline styles to match the visual design system.

### Design System

The app uses a "vintage travel journal" aesthetic:

- **Fonts**: Work Sans (headers) + DM Sans (body) via Google Fonts
- **Colors**: Warm paper tones defined in CSS variables (--background, --primary, etc.)
- **Card Pattern**: Consistent across TripList and TripDetail:
  - Color accent strip (left border using trip.color)
  - Rounded corners (rounded-xl)
  - Hidden action buttons (opacity-0 group-hover:opacity-100)
  - Staggered entrance animations (card-enter keyframe)
  - Uniform button sizing (h-8 w-8)

**Sidebar Structure**: Both pages use identical patterns:
- Fixed header with title + action button
- Scrollable content area below
- Consistent spacing (p-6, space-y-3)

### shadcn/ui Components

UI components in `src/components/ui/` are from shadcn/ui. To add new components:
```bash
npx shadcn@latest add [component-name]
```

Uses Field component (not Form) for form fields to avoid react-hook-form dependency.

## Key Conventions

1. **IDs**: Use `nanoid()` for all entity IDs (trips and locations)

2. **Date Formatting**: Use `date-fns` format function consistently:
   - Full date: `format(new Date(date), 'MMM d, yyyy')`
   - Date range: `format(startDate, 'MMM d') - format(endDate, 'MMM d, yyyy')`

3. **Navigation**: Use `useNavigate()` hook, never `<Link>` components, for better control over navigation logic

4. **Empty States**: Always provide helpful empty states with icons and actionable text

5. **Map Markers**: Implement clickable markers with `<AdvancedMarker>` and `<InfoWindow>` for details on click

## Common Pitfalls

- **Autocomplete in Dialogs**: Don't put Google Places Autocomplete inside Dialog/Modal components - the dropdown gets clipped. Use standalone pages instead.

- **Map Bounds**: After adding/editing locations, the map needs to recalculate bounds. This happens automatically via useEffect watching the locations array.

- **Trip Color**: The `trip.color` field is critical for visual consistency - it's used on cards (border), badges (background), and map markers (fill color).
