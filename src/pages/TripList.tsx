import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trash2, Edit } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function TripListContent() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const navigate = useNavigate();
  const map = useMap();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = () => {
    const loadedTrips = StorageService.getTrips();
    // Sort by start date descending (most recent first)
    const sortedTrips = loadedTrips.sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    setTrips(sortedTrips);
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip?')) {
      StorageService.deleteTrip(id);
      loadTrips();
    }
  };

  // Filter trips with coordinates for map display
  const tripsWithCoordinates = trips.filter(trip => trip.coordinates);

  // Fit map to show all trips
  useEffect(() => {
    if (map && tripsWithCoordinates.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      tripsWithCoordinates.forEach(trip => {
        bounds.extend(trip.coordinates!);
      });
      map.fitBounds(bounds);

      // Add some padding
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [map, tripsWithCoordinates]);

  // Calculate map center as average of all trip coordinates (fallback)
  const mapCenter = tripsWithCoordinates.length > 0
    ? {
        lat: tripsWithCoordinates.reduce((sum, trip) => sum + trip.coordinates!.lat, 0) / tripsWithCoordinates.length,
        lng: tripsWithCoordinates.reduce((sum, trip) => sum + trip.coordinates!.lng, 0) / tripsWithCoordinates.length
      }
    : { lat: 20, lng: 0 };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">
            My Travel Adventures
          </h1>
          <p className="text-muted-foreground">Track your journeys around the world</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={tripsWithCoordinates.length > 0 ? 3 : 2}
            mapId="travelog-map"
            className="w-full h-full"
            colorScheme="LIGHT"
          >
            {tripsWithCoordinates.map((trip) => (
              <AdvancedMarker
                key={trip.id}
                position={trip.coordinates!}
                onClick={() => setSelectedMarker(trip.id)}
              >
                <div className="cursor-pointer hover:scale-110 transition-transform">
                  <MapPin
                    size={32}
                    className="fill-primary text-primary-foreground drop-shadow-lg"
                    strokeWidth={1.5}
                  />
                </div>
              </AdvancedMarker>
            ))}

            {selectedMarker && (() => {
              const selectedTrip = trips.find(t => t.id === selectedMarker);
              return selectedTrip ? (
                <InfoWindow
                  position={selectedTrip.coordinates}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[150px]">
                    <h3 className="font-bold text-sm">
                      {selectedTrip.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(selectedTrip.startDate), 'MMM d')} - {format(new Date(selectedTrip.endDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTrip.locations.length} locations
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 w-full text-xs"
                      onClick={() => navigate(`/trip/${selectedMarker}`)}
                    >
                      View Trip
                    </Button>
                  </div>
                </InfoWindow>
              ) : null;
            })()}
          </Map>
        </div>

        {/* Trips Sidebar */}
        <div className="w-96 bg-card border-l flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-bold">
              Trips ({trips.length})
            </h2>
            <Button onClick={() => navigate('/trip/new')} size="sm">
              <Plus size={16} className="mr-2" />
              Create Trip
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {trips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No trips yet. Click "Create Trip" above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="group bg-muted/50 border rounded-md p-4 hover:bg-muted transition-all cursor-pointer"
                    onClick={() => navigate(`/trip/${trip.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-sm line-clamp-2 flex-1">
                        {trip.name}
                      </h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trip/${trip.id}/edit`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => handleDeleteTrip(trip.id, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        <span>
                          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin size={12} />
                        <span>
                          {trip.locations.length} {trip.locations.length === 1 ? 'location' : 'locations'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripList() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <TripListContent />
    </APIProvider>
  );
}
