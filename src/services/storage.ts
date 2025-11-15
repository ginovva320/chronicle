import type { Trip } from '../types';

const STORAGE_KEY = 'travelog_trips';

export class StorageService {
  static getTrips(): Trip[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading trips:', error);
      return [];
    }
  }

  static saveTrips(trips: Trip[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  }

  static getTrip(id: string): Trip | undefined {
    const trips = this.getTrips();
    return trips.find(trip => trip.id === id);
  }

  static addTrip(trip: Trip): void {
    const trips = this.getTrips();
    trips.push(trip);
    this.saveTrips(trips);
  }

  static updateTrip(id: string, updates: Partial<Trip>): void {
    const trips = this.getTrips();
    const index = trips.findIndex(trip => trip.id === id);
    if (index !== -1) {
      trips[index] = { ...trips[index], ...updates };
      this.saveTrips(trips);
    }
  }

  static deleteTrip(id: string): void {
    const trips = this.getTrips();
    const filtered = trips.filter(trip => trip.id !== id);
    this.saveTrips(filtered);
  }
}
