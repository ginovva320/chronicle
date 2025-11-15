import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Search } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Location } from '../types';
import { StorageService } from '../services/storage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Google Places Autocomplete Search */}
      <div className="pb-6 border-b">
        <Label className="mb-2">
          Search for a place {!places && <span className="text-xs text-muted-foreground">(Loading...)</span>}
        </Label>
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
        <p className="mt-1.5 text-xs text-muted-foreground">
          {places ? "Or manually enter location details below" : "Waiting for Google Places API to load..."}
        </p>
      </div>

      {/* Location Details Section */}
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Location Name</Label>
          <Input
            id="name"
            placeholder="e.g., Eiffel Tower"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Coordinates Group */}
        <div className="bg-muted/50 rounded-md p-4 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coordinates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="e.g., 48.8584"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                className="bg-background"
              />
              {errors.lat && (
                <p className="text-sm text-destructive">{errors.lat}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                placeholder="e.g., 2.2945"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                className="bg-background"
              />
              {errors.lng && (
                <p className="text-sm text-destructive">{errors.lng}</p>
              )}
            </div>
          </div>
        </div>

        {/* Date Field */}
        <div className="space-y-2">
          <Label htmlFor="date">Date (optional)</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="bg-background [color-scheme:dark]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this location..."
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>

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
