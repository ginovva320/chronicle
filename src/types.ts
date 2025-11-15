export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  notes?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  locations: Location[];
  color: string; // For visual distinction on the UI
}
