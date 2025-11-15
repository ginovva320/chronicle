import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trash2, Edit } from 'lucide-react';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { format } from 'date-fns';

export default function TripList() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = () => {
    const loadedTrips = StorageService.getTrips();
    setTrips(loadedTrips);
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip?')) {
      StorageService.deleteTrip(id);
      loadTrips();
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-down">
          <h1 className="text-5xl font-bold font-heading mb-3 text-primary">
            My Travel Adventures
          </h1>
          <p className="text-white/80 text-lg font-body">Track your journeys around the world</p>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip, index) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="group relative bg-dark-card border border-dark-border rounded-elegant overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-warm hover:scale-[1.02] animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Colorful Header */}
              <div className={`h-32 ${trip.color} relative border-b border-dark-border`}>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trip/${trip.id}/edit`);
                    }}
                    className="p-2 bg-dark/80 backdrop-blur-sm border border-white/20 rounded-elegant hover:bg-primary hover:border-primary transition-all"
                  >
                    <Edit size={16} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    className="p-2 bg-dark/80 backdrop-blur-sm border border-white/20 rounded-elegant hover:bg-accent hover:border-accent transition-all"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold font-heading text-white mb-3 line-clamp-2">
                  {trip.name}
                </h3>

                <div className="space-y-2 text-white font-body">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <span className="text-sm">
                      {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-accent" />
                    <span className="text-sm">
                      {trip.locations.length} {trip.locations.length === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Trip Card */}
          <button
            onClick={() => navigate('/trip/new')}
            className="bg-dark-card border-2 border-dashed border-dark-border rounded-elegant p-6 min-h-[250px] flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:border-accent hover:shadow-coral hover:scale-[1.02] group"
          >
            <div className="w-16 h-16 bg-accent border border-accent rounded-elegant flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
              <Plus size={32} className="text-white font-bold" />
            </div>
            <span className="text-lg font-semibold font-heading text-accent group-hover:text-primary transition-colors">
              Create New Trip
            </span>
          </button>
        </div>

        {trips.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-white text-lg mb-4 font-body">No trips yet. Start your adventure!</p>
          </div>
        )}
      </div>
    </div>
  );
}
