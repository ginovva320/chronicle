import type { Trip } from '../types';

// Define the base URL for your API
const API_BASE_URL = '/api/trips';

export class StorageService {
  /**
   * Fetches all trips from the backend API.
   * GET /api/trips
   */
  static async getTrips(): Promise<Trip[]> {
    console.log("getTrips");
    try {
      const response = await fetch(API_BASE_URL);

      if (!response.ok) {
        // Throw an error if the HTTP status is not 200-299
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Ensure the response data is an array of Trips
      return data as Trip[];
    } catch (error) {
      console.error('Error fetching trips:', error);
      // Depending on your application, you might throw the error or return an empty array
      throw error; 
    }
  }

  /**
   * Fetches a single trip by ID.
   * GET /api/trips/:id
   */
  static async getTrip(id: string): Promise<Trip | undefined> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`);

      if (response.status === 404) {
        return undefined; // Trip not found
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as Trip;
    } catch (error) {
      console.error(`Error fetching trip ${id}:`, error);
      throw error;
    }
  }

  /**
   * Adds a new trip to the backend.
   * POST /api/trips
   */
  static async addTrip(trip: Trip): Promise<Trip> {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trip),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // The API usually returns the newly created trip object (with its generated ID)
      return (await response.json()) as Trip;
    } catch (error) {
      console.error('Error adding trip:', error);
      throw error;
    }
  }

  /**
   * Updates an existing trip.
   * PUT or PATCH /api/trips/:id
   */
  static async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    try {
      // Using PATCH for partial updates is common in REST APIs
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // The API usually returns the updated trip object
      return (await response.json()) as Trip;
    } catch (error) {
      console.error(`Error updating trip ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a trip by ID.
   * DELETE /api/trips/:id
   */
  static async deleteTrip(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // DELETE typically returns a 204 No Content, so we don't expect a body
    } catch (error) {
      console.error(`Error deleting trip ${id}:`, error);
      throw error;
    }
  }
}