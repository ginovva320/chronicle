import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Search } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Location } from '../types';
import { StorageService } from '../services/storage';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Button from './ui/Button';

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
      <div className="pb-6 border-b border-dark-border/50">
        <label className="block text-sm font-medium font-heading text-white/90 mb-2">
          Search for a place {!places && <span className="text-xs text-accent">(Loading...)</span>}
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
          <input
            ref={autocompleteInputRef}
            type="text"
            placeholder={places ? "Start typing to search places..." : "Loading Places API..."}
            disabled={!places}
            className="w-full pl-10 pr-4 py-2.5 rounded-elegant border border-dark-border bg-dark-card text-white font-body focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all duration-300 placeholder:text-dark-lighter hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1.5 text-xs text-white/60 font-body italic">
          {places ? "Or manually enter location details below" : "Waiting for Google Places API to load..."}
        </p>
      </div>

      {/* Location Details Section */}
      <div className="space-y-5">
        <Input
          id="name"
          label="Location Name"
          placeholder="e.g., Eiffel Tower"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />

        {/* Coordinates Group */}
        <div className="bg-dark-surface/50 rounded-elegant p-4 space-y-4">
          <h3 className="text-xs font-semibold font-heading text-white/70 uppercase tracking-wide">Coordinates</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="lat"
              label="Latitude"
              type="number"
              step="any"
              placeholder="e.g., 48.8584"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              error={errors.lat}
            />

            <Input
              id="lng"
              label="Longitude"
              type="number"
              step="any"
              placeholder="e.g., 2.2945"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              error={errors.lng}
            />
          </div>
        </div>

        {/* Date Field */}
        <Input
          id="date"
          label="Date (optional)"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />

        <Textarea
          id="notes"
          label="Notes (optional)"
          placeholder="Add any notes about this location..."
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">
          {location?.id ? 'Update Location' : 'Add Location'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
