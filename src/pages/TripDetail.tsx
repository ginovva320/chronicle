import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Trash2, Edit2, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { format } from 'date-fns';
import type { Trip, Location } from '../types';
import { StorageService } from '../services/storage';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LocationForm from '../components/LocationForm';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  const loadTrip = () => {
    if (!id) return;
    const loadedTrip = StorageService.getTrip(id);
    if (loadedTrip) {
      setTrip(loadedTrip);

      // Set map center to first location or default
      if (loadedTrip.locations.length > 0) {
        setMapCenter(loadedTrip.locations[0].coordinates);
      } else {
        setMapCenter({ lat: 20, lng: 0 }); // World view
      }
    }
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!trip || !window.confirm('Delete this location?')) return;

    const updatedLocations = trip.locations.filter(loc => loc.id !== locationId);
    StorageService.updateTrip(trip.id, { locations: updatedLocations });
    loadTrip();
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

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="glass border-b border-slate-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{trip.name}</h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
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
            >
              {trip.locations.map((location) => (
                <AdvancedMarker
                  key={location.id}
                  position={location.coordinates}
                  onClick={() => setSelectedMarker(location.id)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full border-4 border-white shadow-lg" />
                </AdvancedMarker>
              ))}

              {selectedMarker && (
                <InfoWindow
                  position={trip.locations.find(l => l.id === selectedMarker)?.coordinates}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <h3 className="font-semibold">
                      {trip.locations.find(l => l.id === selectedMarker)?.name}
                    </h3>
                    {trip.locations.find(l => l.id === selectedMarker)?.notes && (
                      <p className="text-sm text-slate-600 mt-1">
                        {trip.locations.find(l => l.id === selectedMarker)?.notes}
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>

            {/* Map Hint */}
            <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm text-slate-600">Click on the map to add a location</p>
            </div>
          </div>

        {/* Locations Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-500" />
              Locations ({trip.locations.length})
            </h2>

            {trip.locations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MapPin size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No locations yet</p>
                <p className="text-xs mt-1">Click the map or button to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trip.locations.map((location, index) => (
                  <div
                    key={location.id}
                    className="glass rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedMarker(location.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{location.name}</h3>
                          {location.notes && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{location.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLocation(location);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} className="text-slate-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(location.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                    </p>
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
            loadTrip();
          }}
          onCancel={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
          }}
        />
      </Modal>
    </div>
    </APIProvider>
  );
}
