export type VibeCategory = 'Food' | 'Art' | 'Spots' | 'Culture' | 'Night Owl';

export type GeolocationStatus =
  | 'not-requested'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface DeviceLocationState {
  status: GeolocationStatus;
  coords: UserCoordinates | null;
  error?: string;
}

export interface VibePlace {
  id: string;
  title: string;
  category: VibeCategory;
  description: string;
  image_url: string;
  lat: number;
  lng: number;
  pulse_intensity: number; // 1 to 10
  vq_reward: number;
  created_by: string;
  address: string;
  distance_meters?: number;
  distance_km?: number;
}
