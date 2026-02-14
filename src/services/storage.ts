import type { Trip } from '../types';

const API_BASE_URL = '/api/trips';

type APIErrorResponse = {
  error?: string;
  message?: string;
  details?: Record<string, string>;
};

async function toRequestError(response: Response): Promise<Error> {
  let message = `Request failed (${response.status})`;

  try {
    const payload = (await response.json()) as APIErrorResponse;

    if (payload.error === 'validation_failed' && payload.details) {
      const detailText = Object.entries(payload.details)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      message = `Validation failed: ${detailText}`;
    } else if (payload.message) {
      message = payload.message;
    } else if (payload.error) {
      message = payload.error;
    }
  } catch {
    // Ignore JSON parsing errors and fall back to default message.
  }

  return new Error(message);
}

export class StorageService {
  static async getTrips(): Promise<Trip[]> {
    const response = await fetch(API_BASE_URL);

    if (!response.ok) {
      throw await toRequestError(response);
    }

    return (await response.json()) as Trip[];
  }

  static async getTrip(id: string): Promise<Trip | undefined> {
    const response = await fetch(`${API_BASE_URL}/${id}`);

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw await toRequestError(response);
    }

    return (await response.json()) as Trip;
  }

  static async addTrip(trip: Omit<Trip, 'id'>): Promise<Trip> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trip),
    });

    if (!response.ok) {
      throw await toRequestError(response);
    }

    return (await response.json()) as Trip;
  }

  static async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await toRequestError(response);
    }

    return (await response.json()) as Trip;
  }

  static async deleteTrip(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw await toRequestError(response);
    }
  }
}
