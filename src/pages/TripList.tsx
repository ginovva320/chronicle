import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Trash2, Edit } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { Wordmark } from '../components/chrome/Wordmark';
import { fmtDate, tripDays, yearOf, pad2 } from '../lib/dates';
import { tripCode } from '../lib/tripCode';

function TripListContent() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const navigate = useNavigate();
  const map = useMap();

  useEffect(() => {
    loadTrips();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedTrips = await StorageService.getTrips();
      const sortedTrips = loadedTrips.sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setTrips(sortedTrips);
      if (sortedTrips.length > 0 && !selectedRow) {
        setSelectedRow(sortedTrips[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        setDeletingTripId(id);
        setError(null);
        await StorageService.deleteTrip(id);
        await loadTrips();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete trip.');
      } finally {
        setDeletingTripId(null);
      }
    }
  };

  const tripsWithCoordinates = trips.filter(trip => trip.coordinates);

  useEffect(() => {
    if (map && tripsWithCoordinates.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      tripsWithCoordinates.forEach(trip => {
        bounds.extend(trip.coordinates!);
      });
      map.fitBounds(bounds);
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [map, tripsWithCoordinates]);

  const mapCenter = tripsWithCoordinates.length > 0
    ? {
        lat: tripsWithCoordinates.reduce((sum, trip) => sum + trip.coordinates!.lat, 0) / tripsWithCoordinates.length,
        lng: tripsWithCoordinates.reduce((sum, trip) => sum + trip.coordinates!.lng, 0) / tripsWithCoordinates.length
      }
    : { lat: 20, lng: 0 };

  const totalLocations = trips.reduce((s, t) => s + t.locations.length, 0);
  const years = Array.from(new Set(trips.map(t => yearOf(t.startDate)))).sort((a, b) => b - a);
  const foundingYear = trips.length > 0 ? Math.min(...trips.map(t => yearOf(t.startDate))) : 2023;
  const volumeNumber = new Date().getFullYear() - foundingYear + 1;

  return (
    <div className="h-screen flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-end justify-between px-8 pt-5 pb-4 border-b-2 border-ink">
        <div className="flex items-baseline gap-6">
          <Wordmark size={26} />
          <span className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.12em]">
            Vol. {volumeNumber.toString().padStart(2, '0')} · Personal Travel Index · est. {foundingYear}
          </span>
        </div>
        <div className="flex gap-6 font-mono text-[11px] text-ink-3 items-center">
          <span>FILED · {trips.length.toString().padStart(3, '0')}</span>
          <span>WAYPOINTS · {totalLocations}</span>
          <span>YEARS · {years.length}</span>
          <button
            onClick={() => navigate('/trip/new')}
            className="bg-ink text-paper font-mono text-[11px] font-semibold uppercase tracking-[0.12em] px-3.5 py-2"
          >
            + NEW ENTRY
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-[1fr_460px] grid-rows-[minmax(0,1fr)] overflow-hidden">
        {/* MAP PANEL */}
        <div className="relative border-r-2 border-ink bg-paper-2 min-h-0">
          <div className="absolute inset-0 p-6 flex flex-col">
            <div className="flex justify-between font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em]">
              <span>Plate I — World Index</span>
              <span>Equirectangular projection · {trips.length} entries</span>
            </div>
            <div className="flex-1 flex items-center justify-center mt-3">
              <div className="border border-ink bg-paper w-full h-full">
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={2}
                  mapId="travelog-map"
                  className="w-full h-full"
                  colorScheme="LIGHT"
                  disableDefaultUI={false}
                >
                  {tripsWithCoordinates.map((trip) => (
                    <AdvancedMarker
                      key={trip.id}
                      position={trip.coordinates!}
                      onClick={() => setSelectedMarker(trip.id)}
                    >
                      <div className="cursor-pointer">
                        <svg width="18" height="18" viewBox="0 0 18 18">
                          <circle cx="9" cy="9" r="9" fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.45" />
                          <circle cx="9" cy="9" r="3.5" fill="var(--ink)" />
                        </svg>
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
                        <div className="p-2 font-sans">
                          <h3 className="font-semibold text-sm text-ink">{selectedTrip.name}</h3>
                          <p className="text-xs text-ink-2 mt-1">
                            {fmtDate(selectedTrip.startDate)} - {fmtDate(selectedTrip.endDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-ink-3">{selectedTrip.locations.length} locations</p>
                          <button
                            className="mt-2 w-full bg-ink text-paper text-xs font-mono font-semibold uppercase px-2 py-1"
                            onClick={() => navigate(`/trip/${selectedMarker}`)}
                          >
                            View Trip
                          </button>
                        </div>
                      </InfoWindow>
                    ) : null;
                  })()}
                </Map>
              </div>
            </div>
            <div className="flex gap-5 font-mono text-[10px] text-ink-3 uppercase tracking-[0.08em] mt-3">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ink inline-block" /> Trip anchor
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-px bg-rule-soft inline-block" /> Graticule · 30°
              </span>
              <span className="ml-auto">Click marker to open file</span>
            </div>
          </div>
        </div>

        {/* INDEX COLUMN */}
        <div className="flex flex-col h-full">
          <div className="px-6 pt-4 pb-3 border-b border-ink">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Index of Entries</span>
              <span className="font-mono text-[10px] text-ink-3">SORT · DATE ↓</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_90px_50px] gap-2.5 mt-4 font-mono text-[9px] text-ink-3 uppercase tracking-[0.1em]">
              <span>№</span>
              <span>Title / Region</span>
              <span className="text-right">Dates</span>
              <span className="text-right">Pts</span>
            </div>
          </div>

          {error && (
            <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-2 font-mono text-[11px] text-destructive">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-12 font-mono text-[11px] text-ink-3">
                Loading entries…
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-12 text-ink-3">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-sans text-sm">No trips yet…</p>
              </div>
            ) : (
              trips.map((trip) => {
                const code = tripCode(trip, trips);
                const isSelected = selectedRow === trip.id;
                return (
                  <div
                    key={trip.id}
                    onClick={() => {
                      setSelectedRow(trip.id);
                      navigate(`/trip/${trip.id}`);
                    }}
                    className={`w-full text-left px-6 py-3.5 border-b border-rule-soft transition-colors duration-100 relative group cursor-pointer ${
                      isSelected ? 'bg-paper-2' : 'hover:bg-paper-2'
                    }`}
                    style={{
                      borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent'
                    }}
                  >
                    <div className="grid grid-cols-[60px_1fr_90px_50px] gap-2.5 items-baseline">
                      <span className="font-mono text-[11px] text-ink-3">{code}</span>
                      <div>
                        <div className="font-semibold text-base tracking-[-0.01em] text-ink">{trip.name}</div>
                        <div className="font-mono text-[10px] text-ink-3 mt-0.5 uppercase tracking-[0.08em]">
                          {trip.coordinates ? `${trip.coordinates.lat.toFixed(1)}°, ${trip.coordinates.lng.toFixed(1)}°` : 'No anchor'}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-ink-2">{fmtDate(trip.startDate, 'MMM dd')}</div>
                        <div className="text-ink-3">{yearOf(trip.startDate)}</div>
                      </div>
                      <span className="text-right font-mono text-[13px] text-ink">{pad2(trip.locations.length)}</span>
                    </div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trip/${trip.id}/edit`);
                        }}
                        className="p-1 hover:bg-paper bg-paper-2 border border-ink"
                      >
                        <Edit size={14} className="text-ink" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        disabled={deletingTripId === trip.id}
                        className="p-1 hover:bg-paper bg-paper-2 border border-ink"
                      >
                        <Trash2 size={14} className="text-ink" />
                      </button>
                    </div>
                    <div className="mt-2.5 h-px bg-ink relative">
                      <span className="absolute left-0 top-[-4px] w-px h-[9px] bg-ink" />
                      <span className="absolute right-0 top-[-4px] w-px h-[9px] bg-ink" />
                      <span className="absolute left-1/2 top-[-3px] -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] text-ink-3 bg-paper px-1 uppercase tracking-[0.1em]">
                        {tripDays(trip.startDate, trip.endDate)} days
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t-2 border-ink px-6 py-3 flex justify-between font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em]">
            <span>Page 01 / 01</span>
            <span>Stored locally · sqlite</span>
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
