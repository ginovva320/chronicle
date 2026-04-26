import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { Field, ArchivalInput, ArchivalTextarea } from '../components/chrome/Field';
import { tripCode } from '../lib/tripCode';

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

const TRIP_COLORS = [
  'oklch(0.62 0.16 45)',
  'oklch(0.55 0.10 230)',
  'oklch(0.55 0.12 25)',
  'oklch(0.65 0.13 95)',
  'oklch(0.55 0.13 60)',
  'oklch(0.45 0.06 250)',
];

function TripFormContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    lat: '',
    lng: '',
    locationName: '',
    notes: '',
    color: TRIP_COLORS[0]
  });

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(isEditing));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null);

  const places = useMapsLibrary('places');

  const getTrip = async (id: string) => {
    try {
      setLoading(true);
      const [trip, trips] = await Promise.all([
        StorageService.getTrip(id),
        StorageService.getTrips()
      ]);
      setAllTrips(trips);
      if (trip) {
        setFormData({
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          lat: trip.coordinates?.lat.toString() || '',
          lng: trip.coordinates?.lng.toString() || '',
          locationName: '',
          notes: trip.notes || '',
          color: trip.color || TRIP_COLORS[0]
        });
      } else {
        setSubmitError('Trip not found.');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to load trip.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isEditing && id) {
      getTrip(id);
    } else {
      setLoading(false);
      StorageService.getTrips().then(setAllTrips);
    }
  }, [id, isEditing]);

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
            locationName: placeName,
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
      newErrors.name = 'Trip name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const tripData: Omit<Trip, 'id' | 'locations'> & Partial<Pick<Trip, 'coordinates'>> = {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      notes: formData.notes.trim() || undefined,
      color: formData.color
    };

    if (formData.lat && formData.lng) {
      tripData.coordinates = {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng)
      };
    }

    try {
      if (isEditing && id) {
        await StorageService.updateTrip(id, tripData);
      } else {
        const newTrip: Omit<Trip, 'id'> = {
          ...tripData,
          locations: [],
          color: formData.color
        };
        await StorageService.addTrip(newTrip);
      }
      navigate('/');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-3">
        <p>Loading trip...</p>
      </div>
    );
  }

  const code = isEditing && id ? tripCode({ id, name: formData.name, startDate: formData.startDate, endDate: formData.endDate, locations: [], color: formData.color } as Trip, allTrips) : '';

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[980px] mx-auto">
        {/* TOP BAR */}
        <div className="px-9 py-5 border-b border-ink flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink hover:text-ink-2"
          >
            ← Cancel / {isEditing ? `Edit Entry · ${code}` : 'New Entry'}
          </button>
          <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.14em]">
            FORM 02 · TRIP
          </span>
        </div>

        {/* FORM BODY */}
        <div className="px-16 py-10">
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.14em] mb-3">
            {isEditing ? 'EDIT TRIP RECORD' : 'FILE A NEW TRIP'}
          </div>
          <h1 className="font-serif font-medium text-[56px] leading-[0.95] tracking-[-0.025em] mb-10">
            {isEditing ? formData.name : (
              <>Where did<br />you go?</>
            )}
          </h1>

          {submitError && (
            <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-3 font-mono text-[11px] text-destructive mb-8">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-8">
              <div className="col-span-2">
                <Field label="TRIP NAME" error={errors.name}>
                  <ArchivalInput
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Europe Adventure"
                  />
                </Field>
              </div>

              <Field label="SEARCH A PLACE" help="Auto-fill coordinates from Google Places">
                <input
                  ref={autocompleteInputRef}
                  type="text"
                  placeholder={places ? "Start typing..." : "Loading..."}
                  disabled={!places}
                  className="w-full font-mono text-[13px] text-ink bg-transparent border-0 border-b border-ink px-0 py-2 outline-none focus:border-b-2 focus:border-accent transition-colors disabled:opacity-50"
                />
              </Field>

              {formData.lat && formData.lng ? (
                <>
                  <Field label="LATITUDE">
                    <ArchivalInput
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                      disabled
                    />
                  </Field>
                  <Field label="LONGITUDE">
                    <ArchivalInput
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                      disabled
                    />
                  </Field>
                </>
              ) : (
                <div className="col-span-2 font-mono text-[11px] text-ink-3 py-3 border-b border-rule-soft">
                  No anchor coordinates set
                </div>
              )}

              <Field label="START DATE" error={errors.startDate}>
                <ArchivalInput
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </Field>

              <Field label="END DATE" error={errors.endDate}>
                <ArchivalInput
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </Field>

              <div className="col-span-2">
                <Field label="NOTES" help="Optional details about this trip">
                  <ArchivalTextarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about this trip..."
                  />
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="COLOR">
                  <div className="flex gap-3 pt-2">
                    {TRIP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className="w-7 h-7 transition-all"
                        style={{
                          backgroundColor: color,
                          border: formData.color === color ? '2px solid var(--ink)' : '1px solid var(--rule-soft)'
                        }}
                      />
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-10 pt-5 border-t border-ink flex justify-between items-center">
              <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">
                All fields required except notes.
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save changes →' : 'File trip →'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TripForm() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <TripFormContent />
    </APIProvider>
  );
}
