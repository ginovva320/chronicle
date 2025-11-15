# 🗺️ Travelog

A sleek, modern travel tracking app built with React, TypeScript, and Google Maps. Track your adventures with beautiful visualizations and an intuitive interface.

## ✨ Features

- 📍 Create and manage trips with start/end dates
- 🗺️ Interactive Google Maps integration
- 📝 Add locations with names, coordinates, and notes
- 🎨 Sleek, minimalistic design with vibrant colors
- 💾 Local storage for data persistence
- 📱 Fully responsive design
- ✨ Smooth animations and transitions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
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

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 🎯 Usage

### Creating a Trip

1. Click the "Create New Trip" card on the home page
2. Enter trip name, start date, and end date
3. Click "Create Trip"

### Adding Locations

1. Click on a trip card to view details
2. Click "Add Location" button or click directly on the map
3. Enter location name, coordinates (auto-filled if clicked on map), and optional notes
4. Click "Add Location"

### Managing Locations

- **Edit**: Click the edit icon on any location card
- **Delete**: Click the trash icon on any location card
- **View on Map**: Click a location card to see it highlighted on the map

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Google Maps (@vis.gl/react-google-maps)** - Map integration
- **date-fns** - Date formatting
- **lucide-react** - Icons

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Textarea.tsx
│   └── LocationForm.tsx # Location form component
├── pages/
│   ├── TripList.tsx     # Home page with trip cards
│   ├── TripForm.tsx     # Create/edit trip form
│   └── TripDetail.tsx   # Trip details with map
├── services/
│   └── storage.ts       # LocalStorage abstraction
├── lib/
│   └── utils.ts         # Utility functions
├── types.ts             # TypeScript type definitions
└── App.tsx              # Main app with routing
```

## 🎨 Design Features

- **Glass-morphism effects** for modern UI
- **Vibrant gradient colors** (blue, purple, pink, coral)
- **Smooth animations** on all interactions
- **Responsive layouts** for all screen sizes
- **Custom map markers** with gradient styling

## 🔄 Data Migration

The app currently uses `localStorage` for data persistence, but the storage layer is abstracted in `src/services/storage.ts`, making it easy to migrate to a backend API in the future.

To switch to an API:
1. Update the methods in `StorageService`
2. Replace `localStorage` calls with API requests
3. No changes needed to components!

## 📝 License

MIT

## 🙏 Acknowledgments

Built with modern web technologies and a focus on user experience.
