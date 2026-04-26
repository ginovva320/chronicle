import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Location, Trip } from '../types';
import { StorageService } from '../services/storage';
import { Field, ArchivalInput, ArchivalTextarea } from '../components/chrome/Field';

type PlacesAutocomplete = {
  getPlace: () => {
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: () => number;
        lng: () => number;
      };
    };
  };
  addListener: (eventName: string, handler: () => void) => void;
};

function LocationFormContent() {
  const { tripId, locationId } = useParams<{ tripId: string; locationId?: string }>();
  const navigate = useNavigate();
  const isEditing = !!locationId;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    notes: '',
    date: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null);

  const places = useMapsLibrary('places');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (!tripId) return;

        const loadedTrip = await StorageService.getTrip(tripId);
        if (!loadedTrip) {
          setSubmitError('Trip not found.');
          return;
        }
        setTrip(loadedTrip);

        if (isEditing && locationId) {
          const location = loadedTrip.locations.find(loc => loc.id === locationId);
          if (location) {
            setFormData({
              name: location.name,
              lat: location.coordinates.lat.toString(),
              lng: location.coordinates.lng.toString(),
              notes: location.notes || '',
              date: location.date || ''
            });
          } else {
            setSubmitError('Location not found.');
          }
        }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [tripId, locationId, isEditing]);

  useEffect(() => {
    if (!autocompleteInputRef.current || !places) return;

    try {
      autocompleteRef.current = new places.Autocomplete(
        autocompleteInputRef.current,
        {
          fields: ['name', 'geometry', 'formatted_address'],
        }
      ) as PlacesAutocomplete;

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        const location = place?.geometry?.location;

        if (location) {
          const placeName = place.name || place.formatted_address || '';
          setFormData(prev => ({
            ...prev,
            name: placeName,
            lat: location.lat().toString(),
            lng: location.lng().toString(),
          }));

          if (autocompleteInputRef.current) {
            autocompleteInputRef.current.value = '';
          }
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }
  }, [places]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required';
    }

    if (!formData.lat || !formData.lng) {
      newErrors.coordinates = 'Coordinates are required (search for a place)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !tripId || !trip) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const locationData: Location = {
      id: isEditing && locationId ? locationId : nanoid(),
      name: formData.name,
      coordinates: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng)
      },
      notes: formData.notes.trim() || undefined,
      date: formData.date || undefined
    };

    try {
      let updatedLocations;
      if (isEditing && locationId) {
        updatedLocations = trip.locations.map(loc =>
          loc.id === locationId ? locationData : loc
        );
      } else {
        updatedLocations = [...trip.locations, locationData];
      }

      await StorageService.updateTrip(tripId, { locations: updatedLocations });
      navigate(`/trip/${tripId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-3">
        <p>Loading...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-3">
        <p>{submitError || 'Trip not found.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[980px] mx-auto">
        {/* TOP BAR */}
        <div className="px-9 py-5 border-b border-ink flex justify-between items-center">
          <button
            onClick={() => navigate(`/trip/${tripId}`)}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink hover:text-ink-2"
          >
            ← Cancel / {trip.name} / {isEditing ? 'Edit Stop' : 'New Stop'}
          </button>
          <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.14em]">
            FORM 03 · LOCATION
          </span>
        </div>

        {/* FORM BODY */}
        <div className="px-16 py-10">
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.14em] mb-3">
            {isEditing ? 'EDIT STOP' : 'ADD A STOP'}
          </div>
          <h1 className="font-serif font-medium text-[56px] leading-[0.95] tracking-[-0.025em] mb-10">
            {isEditing ? 'Edit stop.' : 'Add a stop.'}
          </h1>

          {submitError && (
            <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-3 font-mono text-[11px] text-destructive mb-8">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              <Field label="SEARCH A PLACE" help="Auto-fill location name and coordinates" error={errors.coordinates}>
                <input
                  ref={autocompleteInputRef}
                  type="text"
                  placeholder={places ? "Start typing..." : "Loading..."}
                  disabled={!places}
                  className="w-full font-mono text-[13px] text-ink bg-transparent border-0 border-b border-ink px-0 py-2 outline-none focus:border-b-2 focus:border-accent transition-colors disabled:opacity-50"
                />
              </Field>

              {formData.lat && formData.lng ? (
                <div className="font-mono text-[11px] text-ink-3 py-3 border-b border-ink">
                  <div className="uppercase tracking-[0.14em] mb-2">COORDINATES</div>
                  <div className="text-[13px] text-ink">
                    {parseFloat(formData.lat).toFixed(6)}°, {parseFloat(formData.lng).toFixed(6)}°
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[11px] text-ink-3 py-3 border-b border-rule-soft">
                  No coordinates set — search for a place above
                </div>
              )}

              <Field label="LOCATION NAME" error={errors.name}>
                <ArchivalInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Eiffel Tower"
                />
              </Field>

              <Field label="DATE" help="Optional visit date">
                <ArchivalInput
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </Field>

              <Field label="NOTES" help="Optional details about this location">
                <ArchivalTextarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this location..."
                />
              </Field>
            </div>

            {/* FOOTER */}
            <div className="mt-10 pt-5 border-t border-ink flex justify-between items-center">
              <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">
                All fields required except date and notes.
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/trip/${tripId}`)}
                  disabled={isSubmitting}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] px-5 py-3 border border-ink text-ink hover:bg-paper-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] px-5.5 py-3 bg-ink text-paper hover:bg-ink-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save changes →' : 'Add stop →'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LocationForm() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <LocationFormContent />
    </APIProvider>
  );
}
