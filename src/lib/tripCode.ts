import type { Trip } from '../types';

export function tripCode(trip: Trip, allTrips: Trip[]): string {
  const sorted = [...allTrips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const idx = sorted.findIndex(t => t.id === trip.id);
  return `CHR-${String(idx + 1).padStart(3, '0')}`;
}
