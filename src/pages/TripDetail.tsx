import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Trash2, Edit2, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { format } from 'date-fns';
import type { Trip, Location } from '../types';
import { StorageService } from '../services/storage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LocationForm from '@/components/LocationForm';

function TripDetailContent({ trip, onLocationUpdate }: { trip: Trip; onLocationUpdate: () => void }) {
  const navigate = useNavigate();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const map = useMap();

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
    setEditingLocation(location);
    setIsLocationModalOpen(true);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsLocationModalOpen(true);
  };

  const mapCenter = trip.locations.length > 0 ? trip.locations[0].coordinates : { lat: 20, lng: 0 };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{trip.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar size={14} />
                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button onClick={handleAddLocation} size="sm">
            <Plus size={16} />
            Add Location
          </Button>
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
              >
                <div className="p-3 bg-card rounded-md min-w-[200px]">
                  <h3 className="font-bold text-sm">
                    {trip.locations.find(l => l.id === selectedMarker)?.name}
                  </h3>
                  {trip.locations.find(l => l.id === selectedMarker)?.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {trip.locations.find(l => l.id === selectedMarker)?.notes}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

      {/* Locations Sidebar */}
      <div className="w-96 bg-card border-l overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Locations ({trip.locations.length})
          </h2>

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
                  className="bg-muted/50 border rounded-md p-4 hover:bg-muted transition-all cursor-pointer"
                  onClick={() => centerOnLocation(location)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-7 h-7 bg-primary border-2 border-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{location.name}</h3>
                        {location.date && (
                          <p className="text-xs mt-1 font-medium">
                            {format(new Date(location.date), 'MMM d, yyyy')}
                          </p>
                        )}
                        {location.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{location.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
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

    {/* Location Dialog */}
    <Dialog
      open={isLocationModalOpen}
      onOpenChange={(open) => {
        setIsLocationModalOpen(open);
        if (!open) setEditingLocation(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingLocation?.id ? 'Edit Location' : 'Add Location'}</DialogTitle>
        </DialogHeader>
        <LocationForm
          tripId={trip.id}
          location={editingLocation}
          onSave={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
            onLocationUpdate();
          }}
          onCancel={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
          }}
        />
      </DialogContent>
    </Dialog>
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
