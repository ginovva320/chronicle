import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Edit2 } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Polyline } from '../components/Polyline';
import type { Trip, Location } from '../types';
import { StorageService } from '../services/storage';
import { MetaRow } from '../components/chrome/MetaRow';
import { fmtRange, tripDays, fmtDate } from '../lib/dates';
import { tripCode } from '../lib/tripCode';

function TripDetailContent({
  trip,
  allTrips,
  onLocationUpdate,
  setError
}: {
  trip: Trip;
  allTrips: Trip[];
  onLocationUpdate: () => Promise<void>;
  setError: (value: string | null) => void;
}) {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    if (map && trip.locations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      trip.locations.forEach(location => {
        bounds.extend(location.coordinates);
      });
      map.fitBounds(bounds);
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [map, trip.locations]);

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
      map.setZoom(15);
    }
    setSelectedLocation(location.id);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!window.confirm('Delete this location?')) return;
    const updatedLocations = trip.locations.filter(loc => loc.id !== locationId);
    try {
      setError(null);
      await StorageService.updateTrip(trip.id, { locations: updatedLocations });
      await onLocationUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete location.');
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm('Delete this trip?')) return;
    try {
      await StorageService.deleteTrip(trip.id);
      navigate('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete trip.');
    }
  };

  const mapCenter = trip.locations.length > 0
    ? {
        lat: trip.locations.reduce((sum, loc) => sum + loc.coordinates.lat, 0) / trip.locations.length,
        lng: trip.locations.reduce((sum, loc) => sum + loc.coordinates.lng, 0) / trip.locations.length
      }
    : trip.coordinates || { lat: 0, lng: 0 };

  const code = tripCode(trip, allTrips);
  const region = trip.coordinates
    ? `${trip.coordinates.lat.toFixed(1)}°, ${trip.coordinates.lng.toFixed(1)}°`
    : 'No anchor';

  return (
    <div className="h-screen flex flex-col">
      {/* BREADCRUMB BAR */}
      <div className="px-9 py-5 border-b border-ink flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink flex items-center gap-2 hover:text-ink-2"
        >
          ← Chronicle / Trips / {code}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/trip/${trip.id}/edit`)}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 border border-ink text-ink hover:bg-paper-2"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteTrip}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 border border-ink text-ink hover:bg-paper-2"
          >
            Delete
          </button>
        </div>
      </div>

      {/* TITLE BLOCK */}
      <div className="px-9 pt-8 pb-6 border-b border-rule-soft flex gap-10">
        <div className="flex-1">
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.14em]">
            {code} · {region}
          </div>
          <h1 className="font-serif font-medium text-[88px] leading-[0.95] tracking-[-0.025em] mt-3">
            {trip.name}
          </h1>
          {trip.notes && (
            <p className="font-sans text-[15px] text-ink-2 leading-[1.55] max-w-[600px] mt-4.5">
              {trip.notes}
            </p>
          )}
        </div>
        <div className="min-w-[280px]">
          <MetaRow k="DATES" v={fmtRange(trip.startDate, trip.endDate)} />
          <MetaRow k="DURATION" v={`${tripDays(trip.startDate, trip.endDate)} days`} />
          <MetaRow k="STOPS" v={trip.locations.length.toString()} />
          {trip.coordinates && (
            <MetaRow k="ANCHOR" v={`${trip.coordinates.lat.toFixed(3)}°, ${trip.coordinates.lng.toFixed(3)}°`} />
          )}
        </div>
      </div>

      {/* TWO-COL MAIN */}
      <div className="flex-1 grid grid-cols-[1fr_480px] grid-rows-[minmax(0,1fr)] overflow-hidden">
        {/* MAP PLATE */}
        <div className="relative p-6 bg-paper-2 border-r border-ink min-h-0">
          <div className="flex justify-between font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em]">
            <span>Plate II — Route</span>
            <span>Scale ~ 1 : varies</span>
          </div>
          <div className="mt-3 border border-ink bg-paper h-[calc(100%-32px)]">
            <Map
              defaultCenter={mapCenter}
              defaultZoom={12}
              mapId="travelog-map"
              className="w-full h-full"
              colorScheme="LIGHT"
            >
              {sortedLocations.map((location, idx) => (
                <AdvancedMarker
                  key={location.id}
                  position={location.coordinates}
                  onClick={() => centerOnLocation(location)}
                >
                  <div className="cursor-pointer w-7 h-7 rounded-full bg-paper border border-accent flex items-center justify-center">
                    <span className="font-mono text-[10px] font-semibold text-accent">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                  </div>
                </AdvancedMarker>
              ))}

              {sortedLocations.length > 1 && (
                <Polyline
                  path={sortedLocations.map(l => l.coordinates)}
                  options={{
                    strokeColor: 'var(--accent)',
                    strokeOpacity: 0,
                    icons: [{
                      icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: 1,
                        scale: 3
                      },
                      offset: '0',
                      repeat: '8px'
                    }]
                  }}
                />
              )}
            </Map>
          </div>
        </div>

        {/* ITINERARY SIDEBAR */}
        <div className="flex flex-col h-full">
          <div className="px-6 py-3.5 border-b border-ink flex justify-between items-center">
            <span className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.12em]">
              Itinerary · {trip.locations.length} stops
            </span>
            <button
              onClick={() => navigate(`/trip/${trip.id}/location/new`)}
              className="bg-ink text-paper font-mono text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1.5"
            >
              + ADD STOP
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {sortedLocations.map((location, idx) => {
              const isSelected = selectedLocation === location.id;
              return (
                <div
                  key={location.id}
                  onClick={() => centerOnLocation(location)}
                  className={`w-full text-left px-6 py-3.5 border-b border-rule-soft hover:bg-paper-2 transition-colors group relative cursor-pointer ${
                    isSelected ? 'border-l-2 border-l-accent' : ''
                  }`}
                >
                  <div className="grid grid-cols-[52px_1fr] gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full border border-ink flex items-center justify-center">
                        <span className="font-mono text-[12px] font-semibold text-ink">
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                      </div>
                      {idx < sortedLocations.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-[-14px] w-px border-l border-dashed border-ink-3" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] text-ink">{location.name}</div>
                      <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mt-1">
                        {location.date ? fmtDate(location.date, 'MMM d, yyyy') : 'UNDATED'} · {location.coordinates.lat.toFixed(2)}°, {location.coordinates.lng.toFixed(2)}°
                      </div>
                      {location.notes && (
                        <p className="text-[12px] text-ink-2 leading-[1.5] mt-2">{location.notes}</p>
                      )}
                      <div className="absolute right-2 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trip/${trip.id}/location/${location.id}/edit`);
                          }}
                          className="p-1 hover:bg-paper"
                        >
                          <Edit2 size={14} className="text-ink" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(location.id);
                          }}
                          className="p-1 hover:bg-paper"
                        >
                          <Trash2 size={14} className="text-ink" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrip = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [loadedTrip, trips] = await Promise.all([
        StorageService.getTrip(id),
        StorageService.getTrips()
      ]);
      if (loadedTrip) {
        setTrip(loadedTrip);
        setAllTrips(trips);
        setError(null);
      } else {
        setError('Trip not found.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id, loadTrip]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-3">
        <p>Loading trip...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 font-mono">
        <p className="text-ink-3">{error || 'Trip not found.'}</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      {error && (
        <div className="fixed left-4 top-4 z-50 border-l-2 border-destructive bg-destructive/10 px-4 py-2 font-mono text-[11px] text-destructive">
          {error}
        </div>
      )}
      <TripDetailContent trip={trip} allTrips={allTrips} onLocationUpdate={loadTrip} setError={setError} />
    </APIProvider>
  );
}
