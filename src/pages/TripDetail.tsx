import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Trash2, Edit2, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { format } from 'date-fns';
import type { Trip, Location } from '../types';
import { StorageService } from '../services/storage';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LocationForm from '../components/LocationForm';

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

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      setEditingLocation({
        id: '',
        name: '',
        coordinates: {
          lat: e.detail.latLng.lat,
          lng: e.detail.latLng.lng
        },
        notes: ''
      });
      setIsLocationModalOpen(true);
    }
  };

  const mapCenter = trip.locations.length > 0 ? trip.locations[0].coordinates : { lat: 20, lng: 0 };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-dark-surface border-b border-dark-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-primary/20 border border-transparent hover:border-primary/30 rounded-elegant transition-all"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-heading text-primary">{trip.name}</h1>
              <p className="text-sm text-white/80 flex items-center gap-2 font-body">
                <Calendar size={14} />
                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button onClick={handleAddLocation} size="sm">
            <Plus size={16} className="mr-2" />
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
            onClick={handleMapClick}
            className="w-full h-full"
            colorScheme="DARK"
          >
            {trip.locations.map((location) => (
              <AdvancedMarker
                key={location.id}
                position={location.coordinates}
                onClick={() => centerOnLocation(location)}
              >
                <div className="w-8 h-8 bg-primary border border-dark rounded-elegant shadow-warm hover:scale-110 transition-transform cursor-pointer" />
              </AdvancedMarker>
            ))}

            {selectedMarker && (
              <InfoWindow
                position={trip.locations.find(l => l.id === selectedMarker)?.coordinates}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-3 bg-dark-card rounded-elegant min-w-[200px]">
                  <h3 className="font-bold font-heading text-sm text-primary">
                    {trip.locations.find(l => l.id === selectedMarker)?.name}
                  </h3>
                  {trip.locations.find(l => l.id === selectedMarker)?.notes && (
                    <p className="text-xs text-white/80 mt-1.5 font-body">
                      {trip.locations.find(l => l.id === selectedMarker)?.notes}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>

          {/* Map Hint */}
          <div className="absolute bottom-4 left-4 bg-dark-surface/90 backdrop-blur-sm border border-primary/30 rounded-elegant px-4 py-2 shadow-warm">
            <p className="text-sm text-white/90 font-body">Click on the map to add a location</p>
          </div>
        </div>

      {/* Locations Sidebar */}
      <div className="w-96 bg-dark-surface border-l border-dark-border overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold font-heading text-primary mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            Locations ({trip.locations.length})
          </h2>

          {trip.locations.length === 0 ? (
            <div className="text-center py-12 text-white/80">
              <MapPin size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-body">No locations yet</p>
              <p className="text-xs mt-1 font-body">Click the map or button to add</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLocations.map((location, index) => (
                <div
                  key={location.id}
                  className="bg-dark-card border border-dark-border rounded-elegant p-4 hover:border-primary/50 hover:shadow-warm transition-all cursor-pointer"
                  onClick={() => centerOnLocation(location)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-7 h-7 bg-primary border-2 border-primary rounded-full flex items-center justify-center text-dark text-xs font-bold font-heading shadow-warm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold font-heading text-white text-sm">{location.name}</h3>
                        {location.date && (
                          <p className="text-xs text-primary mt-1 font-body font-medium">
                            {format(new Date(location.date), 'MMM d, yyyy')}
                          </p>
                        )}
                        {location.notes && (
                          <p className="text-xs text-white/70 mt-1 line-clamp-2 font-body">{location.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLocation(location);
                        }}
                        className="p-1.5 hover:bg-primary/20 border border-transparent hover:border-primary/30 rounded-elegant transition-all"
                      >
                        <Edit2 size={14} className="text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(location.id);
                        }}
                        className="p-1.5 hover:bg-accent/20 border border-transparent hover:border-accent/30 rounded-elegant transition-all"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Location Modal */}
    <Modal
      isOpen={isLocationModalOpen}
      onClose={() => {
        setIsLocationModalOpen(false);
        setEditingLocation(null);
      }}
      title={editingLocation?.id ? 'Edit Location' : 'Add Location'}
    >
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
    </Modal>
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
        <p className="text-white font-body">Loading...</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <TripDetailContent trip={trip} onLocationUpdate={loadTrip} />
    </APIProvider>
  );
}
