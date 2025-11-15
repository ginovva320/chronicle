import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ArrowLeft } from 'lucide-react';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { getRandomColor } from '../lib/utils';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function TripForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      const trip = StorageService.getTrip(id);
      if (trip) {
        setFormData({
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate
        });
      }
    }
  }, [id, isEditing]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (isEditing) {
      StorageService.updateTrip(id, formData);
    } else {
      const newTrip: Trip = {
        id: nanoid(),
        ...formData,
        locations: [],
        color: getRandomColor()
      };
      StorageService.addTrip(newTrip);
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white hover:text-primary mb-6 transition-colors font-body font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back to trips</span>
        </button>

        {/* Form Card */}
        <div className="bg-dark-card border border-primary/30 rounded-elegant p-8 shadow-warm-lg animate-scale-in">
          <h1 className="text-3xl font-bold font-heading mb-6 text-primary">
            {isEditing ? 'Edit Trip' : 'Create New Trip'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="name"
              label="Trip Name"
              placeholder="e.g., Summer Europe Adventure"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
            />

            <Input
              id="startDate"
              type="date"
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={errors.startDate}
            />

            <Input
              id="endDate"
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={errors.endDate}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" className="flex-1">
                {isEditing ? 'Update Trip' : 'Create Trip'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
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
