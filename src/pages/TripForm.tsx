import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { getRandomColor } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';

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
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(isEditing));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null);

  // Load the Google Maps Places library
  const places = useMapsLibrary('places');

  const getTrip = async (id: string) => {
    try {
      setLoading(true);
      const trip = await StorageService.getTrip(id);
      if (trip) {
        setFormData({
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          lat: trip.coordinates?.lat.toString() || '',
          lng: trip.coordinates?.lng.toString() || '',
          locationName: '',
          notes: trip.notes || ''
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
    }
  }, [id, isEditing]);

  // Initialize Google Places Autocomplete
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

    const tripData: Omit<Trip, 'id' | 'locations' | 'color'> & Partial<Pick<Trip, 'coordinates'>> = {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      notes: formData.notes.trim() || undefined
    };

    // Add coordinates if provided
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
          color: getRandomColor()
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading trip...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to trips</span>
        </Button>

        {/* Form Card */}
        <div className="bg-card border rounded-lg p-8 shadow-md">
          <h1 className="text-3xl font-bold mb-6">
            {isEditing ? 'Edit Trip' : 'Create New Trip'}
          </h1>
          {submitError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Search at Top */}
              <Field>
                <FieldLabel>
                  Search for a place {!places && <span className="text-xs text-muted-foreground">(Loading...)</span>}
                </FieldLabel>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    placeholder={places ? "Start typing to search places..." : "Loading Places API..."}
                    disabled={!places}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-10 pr-4 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>
              </Field>

              {/* Coordinates Display */}
              {(formData.lat && formData.lng) ? (
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Coordinates</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Latitude:</span>
                      <p className="font-medium">{formData.lat}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Longitude:</span>
                      <p className="font-medium">{formData.lng}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, lat: '', lng: '', locationName: '', name: '' })}
                    className="mt-3 text-xs"
                  >
                    Clear location
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-md">
                  Search for a place above to set trip location
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="name">Trip Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g., Summer Europe Adventure"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background"
                  aria-invalid={!!errors.name}
                />
                <FieldError>{errors.name}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-background [color-scheme:light]"
                  aria-invalid={!!errors.startDate}
                />
                <FieldError>{errors.startDate}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-background [color-scheme:light]"
                  aria-invalid={!!errors.endDate}
                />
                <FieldError>{errors.endDate}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this trip..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-background"
                />
              </Field>
            </FieldGroup>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Trip' : 'Create Trip'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
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
