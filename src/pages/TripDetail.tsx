import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Trash2, Edit2, MapPin, PlusIcon } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { format } from 'date-fns';
import type { Trip, Location } from '../types';
import { StorageService } from '../services/storage';
import { Button } from '@/components/ui/button';

function TripDetailContent({ trip, onLocationUpdate }: { trip: Trip; onLocationUpdate: () => void }) {
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const map = useMap();

  // Fit map to show all locations
  useEffect(() => {
    if (map && trip.locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      trip.locations.forEach(location => {
        bounds.extend(location.coordinates);
      });
      map.fitBounds(bounds);

      // Add some padding
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [map, trip.locations]);

  // Sort locations by date (dated first, then undated)
  const sortedLocations = [...trip.locations].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  const centerOnLocation = (location: Location) => {
    if (map) {
      map.panTo(location.coordinates);
      map.setZoom(10);
    }
    setSelectedMarker(location.id);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!window.confirm('Delete this location?')) return;
    const updatedLocations = trip.locations.filter(loc => loc.id !== locationId);
    StorageService.updateTrip(trip.id, { locations: updatedLocations });
    onLocationUpdate();
  };

  const handleEditLocation = (location: Location) => {
    navigate(`/trip/${trip.id}/location/${location.id}/edit`);
  };

  const handleAddLocation = () => {
    navigate(`/trip/${trip.id}/location/new`);
  };

  // Calculate map center as average of all location coordinates
  const mapCenter = trip.locations.length > 0
    ? {
        lat: trip.locations.reduce((sum, loc) => sum + loc.coordinates.lat, 0) / trip.locations.length,
        lng: trip.locations.reduce((sum, loc) => sum + loc.coordinates.lng, 0) / trip.locations.length
      }
    : { lat: 20, lng: 0 };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6 flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold decorative-underline">{trip.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar size={14} />
            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={trip.locations.length > 0 ? 8 : 2}
            mapId="travelog-map"
            className="w-full h-full"
            colorScheme="LIGHT"
          >
            {trip.locations.map((location) => (
              <AdvancedMarker
                key={location.id}
                position={location.coordinates}
                onClick={() => centerOnLocation(location)}
              >
                <div className="cursor-pointer hover:scale-110 transition-transform">
                  <MapPin
                    size={32}
                    color={trip.color || '#ffffffff'}
                    className="fill-primary text-primary-foreground drop-shadow-lg"
                    strokeWidth={1.5}
                  />
                </div>
              </AdvancedMarker>
            ))}

            {selectedMarker && (
              <InfoWindow
                position={trip.locations.find(l => l.id === selectedMarker)?.coordinates}
                onCloseClick={() => setSelectedMarker(null)}
                headerContent={
                  <h3 className="font-bold text-sm">
                    {trip.locations.find(l => l.id === selectedMarker)?.name}
                  </h3>
                }
              >
                <div className="p-1">
                  {trip.locations.find(l => l.id === selectedMarker)?.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {trip.locations.find(l => l.id === selectedMarker)?.notes}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

      {/* Locations Sidebar */}
      <div className="w-96 bg-sidebar border-l border-border flex flex-col shadow-lg">
        {/* Fixed Header */}
        <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-accent hover:text-accent-foreground h-8 w-8"
            >
              <ArrowLeft size={18} />
            </Button>
            <h2 className="text-xl font-bold decorative-underline">
              Locations ({trip.locations.length})
            </h2>
          </div>
          <Button onClick={handleAddLocation} size="icon" className="shadow-md hover:shadow-lg transition-shadow">
            <PlusIcon/>
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {trip.locations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No locations yet</p>
              <p className="text-xs mt-1">Click the map or button to add</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLocations.map((location, index) => (
                <div
                  key={location.id}
                  className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg"
                  onClick={() => centerOnLocation(location)}
                  style={{
                    animation: `card-enter 0.4s ease-out ${index * 0.05}s backwards`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="w-9 h-9 stamp-badge rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{
                          backgroundColor: trip.color || '#8B5A3C',
                          color: '#FFFDFB'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{location.name}</h3>
                        {location.date && (
                          <p className="text-xs mt-1.5 font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar size={12} />
                            {format(new Date(location.date), 'MMM d, yyyy')}
                          </p>
                        )}
                        {location.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{location.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLocation(location);
                        }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(location.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
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

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);

  const loadTrip = () => {
    if (!id) return;
    const loadedTrip = StorageService.getTrip(id);
    if (loadedTrip) {
      setTrip(loadedTrip);
    }
  };

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <TripDetailContent trip={trip} onLocationUpdate={loadTrip} />
    </APIProvider>
  );
}
