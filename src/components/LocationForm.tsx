import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Search } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Location } from '../types';
import { StorageService } from '../services/storage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';

interface LocationFormProps {
  tripId: string;
  location: Location | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function LocationForm({ tripId, location, onSave, onCancel }: LocationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    notes: '',
    date: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Load the Google Maps Places library
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        lat: location.coordinates.lat.toString(),
        lng: location.coordinates.lng.toString(),
        notes: location.notes || '',
        date: location.date || ''
      });
    }
  }, [location]);

  useEffect(() => {
    if (!autocompleteInputRef.current || !places) return;

    try {
      autocompleteRef.current = new places.Autocomplete(
        autocompleteInputRef.current,
        {
          fields: ['name', 'geometry', 'formatted_address'],
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place?.geometry?.location) {
          setFormData(prev => ({
            ...prev,
            name: place.name || place.formatted_address || '',
            lat: place.geometry.location.lat().toString(),
            lng: place.geometry.location.lng().toString(),
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

    const lat = parseFloat(formData.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.lat = 'Valid latitude required (-90 to 90)';
    }

    const lng = parseFloat(formData.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.lng = 'Valid longitude required (-180 to 180)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const trip = StorageService.getTrip(tripId);
    if (!trip) return;

    const newLocation: Location = {
      id: location?.id || nanoid(),
      name: formData.name.trim(),
      coordinates: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng)
      },
      notes: formData.notes.trim(),
      date: formData.date || undefined
    };

    let updatedLocations: Location[];
    if (location?.id) {
      // Update existing location
      updatedLocations = trip.locations.map(loc =>
        loc.id === location.id ? newLocation : loc
      );
    } else {
      // Add new location
      updatedLocations = [...trip.locations, newLocation];
    }

    StorageService.updateTrip(tripId, { locations: updatedLocations });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {/* Google Places Autocomplete Search */}
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
            {(errors.lat || errors.lng) && (
              <div className="mt-2">
                <FieldError>{errors.lat || errors.lng}</FieldError>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormData({ ...formData, lat: '', lng: '', name: '' })}
              className="mt-3 text-xs"
            >
              Clear location
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-md">
            Search for a place above to set coordinates
          </div>
        )}

        {/* Location Details Section */}
        <Field>
          <FieldLabel htmlFor="name">Location Name</FieldLabel>
          <Input
            id="name"
            placeholder="e.g., Eiffel Tower"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background"
            aria-invalid={!!errors.name}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        {/* Date Field */}
        <Field>
          <FieldLabel htmlFor="date">Date (optional)</FieldLabel>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="bg-background [color-scheme:light]"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea
            id="notes"
            placeholder="Add any notes about this location..."
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="bg-background"
          />
        </Field>
      </FieldGroup>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">
          {location?.id ? 'Update Location' : 'Add Location'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
