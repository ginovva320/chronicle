import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trash2, Edit } from 'lucide-react';
import type { Trip } from '../types';
import { StorageService } from '../services/storage';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-3">
            My Travel Adventures
          </h1>
          <p className="text-muted-foreground text-lg">Track your journeys around the world</p>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Card
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="group relative overflow-hidden cursor-pointer transition-all hover:shadow-md"
            >
              <CardHeader className="relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trip/${trip.id}/edit`);
                    }}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>

              {/* Content */}
              <CardContent>
                <h3 className="text-xl font-bold mb-3 line-clamp-2">
                  {trip.name}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} />
                    <span>
                      {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={16} />
                    <span>
                      {trip.locations.length} {trip.locations.length === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Trip Card */}
          <Card
            onClick={() => navigate('/trip/new')}
            className="border-2 border-dashed min-h-[250px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:shadow-md group"
          >
            <div className="w-16 h-16 border rounded-md flex items-center justify-center">
              <Plus size={32} />
            </div>
            <span className="text-lg font-semibold">
              Create New Trip
            </span>
          </Card>
        </div>

        {trips.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">No trips yet. Start your adventure!</p>
          </div>
        )}
      </div>
    </div>
  );
}
