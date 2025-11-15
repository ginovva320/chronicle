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
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            My Travel Adventures
          </h1>
          <p className="text-slate-600 text-lg">Track your journeys around the world</p>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip, index) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="group relative glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Colorful Header */}
              <div className={`h-32 ${trip.color} relative`}>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trip/${trip.id}/edit`);
                    }}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                  >
                    <Edit size={16} className="text-slate-700" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">
                  {trip.name}
                </h3>

                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary-500" />
                    <span className="text-sm">
                      {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-purple-500" />
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
            className="glass rounded-2xl p-6 min-h-[250px] flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:shadow-2xl hover:scale-105 group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={32} className="text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Create New Trip
            </span>
          </button>
        </div>

        {trips.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-slate-500 text-lg mb-4">No trips yet. Start your adventure!</p>
          </div>
        )}
      </div>
    </div>
  );
}
