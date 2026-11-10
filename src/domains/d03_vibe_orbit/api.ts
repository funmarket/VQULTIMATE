import { supabase } from '../../lib/supabase';
import {
  VibePlace,
  VibeCategory,
  DeviceLocationState,
  UserCoordinates
} from './types';

export const DISCOVERY_RADIUS_METERS = 8000; // 8 km leisure discovery scope

/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Requests device location once via navigator.geolocation.getCurrentPosition.
 */
export function getDeviceLocation(): Promise<DeviceLocationState> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        status: 'unavailable',
        coords: null,
        error: 'Geolocation is not supported by your browser or environment.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'granted',
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        });
      },
      (error) => {
        let status: DeviceLocationState['status'] = 'unavailable';
        let errorMsg = 'Unable to determine your position.';

        if (error.code === error.PERMISSION_DENIED) {
          status = 'denied';
          errorMsg = 'Location permission was denied. Please allow location access in your browser settings to enable proximity discovery.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          status = 'unavailable';
          errorMsg = 'GPS sensor or location provider is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          status = 'unavailable';
          errorMsg = 'Location acquisition timed out.';
        }

        resolve({
          status,
          coords: null,
          error: errorMsg
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

/**
 * Continuously watches device location changes and informs subscriber.
 */
export function watchDeviceLocation(
  onUpdate: (state: DeviceLocationState) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onUpdate({
      status: 'unavailable',
      coords: null,
      error: 'Geolocation is not supported by this browser.'
    });
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        status: 'granted',
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
    },
    (error) => {
      let status: DeviceLocationState['status'] = 'unavailable';
      let errorMsg = 'Location error occurred.';

      if (error.code === error.PERMISSION_DENIED) {
        status = 'denied';
        errorMsg = 'Location access denied by user.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        status = 'unavailable';
        errorMsg = 'Location signal currently unavailable.';
      } else if (error.code === error.TIMEOUT) {
        status = 'unavailable';
        errorMsg = 'Location request timed out.';
      }

      onUpdate({
        status,
        coords: null,
        error: errorMsg
      });
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Public domain API: Fetches real nearby places from the Supabase Edge Function 'nearby-places'
 * which queries the Google Places API server-side using GOOGLE_PLACES_API_KEY.
 *
 * Rules:
 * - Real data only. No mocks. No hardcoded place arrays.
 * - If Google returns nothing or fails, returns an empty array [].
 * - Uses the returned photo URL. Do not invent ratings.
 * - Preserves server's Google Relevance/Rating-first, Distance-second sort order.
 * - In-app checkins_count and confirmations_count are never aliased from Google reviews_count.
 */
export async function fetchNearbyPlaces(
  coords: UserCoordinates | null,
  category?: VibeCategory | 'All'
): Promise<VibePlace[]> {
  let targetCoords = coords;

  // If coordinates are not provided, attempt to acquire real device GPS once
  if (!targetCoords || isNaN(targetCoords.lat) || isNaN(targetCoords.lng)) {
    const locState = await getDeviceLocation();
    if (locState.status === 'granted' && locState.coords) {
      targetCoords = locState.coords;
    }
  }

  // Without coordinates, do not fabricate locations: return empty array
  if (!targetCoords || isNaN(targetCoords.lat) || isNaN(targetCoords.lng)) {
    return [];
  }

  try {
    const selectedCategory = category || 'All';
    const { data, error } = await supabase.functions.invoke('nearby-places', {
      body: {
        lat: targetCoords.lat,
        lng: targetCoords.lng,
        radius: DISCOVERY_RADIUS_METERS,
        category: selectedCategory
      }
    });

    if (error || !data || !Array.isArray(data.places)) {
      if (error) {
        console.warn('Error invoking nearby-places Edge Function:', error);
      }
      return [];
    }

    // Preserve the server's Google Relevance/Rating-first, Distance-second sort order.
    // Keep in-app checkins_count / confirmations_count strictly separate from Google reviews_count.
    const places: VibePlace[] = data.places.map((p: any) => {
      const dist =
        typeof p.distance_meters === 'number'
          ? p.distance_meters
          : calculateDistanceMeters(targetCoords!.lat, targetCoords!.lng, p.lat, p.lng);
      return {
        ...p,
        distance_meters: dist,
        distance_km: Number((dist / 1000).toFixed(2)),
        reviews_count: typeof p.reviews_count === 'number' ? p.reviews_count : undefined,
        checkins_count: typeof p.checkins_count === 'number' ? p.checkins_count : undefined,
        confirmations_count: typeof p.confirmations_count === 'number' ? p.confirmations_count : undefined
      };
    });

    return places;
  } catch (err) {
    console.warn('fetchNearbyPlaces failure:', err);
    return [];
  }
}

/**
 * Backward-compatible alias for fetchNearbyPlaces.
 */
export const fetchNearbyVibePlaces = fetchNearbyPlaces;

/**
 * Backward-compatible function querying real nearby places.
 */
export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  return fetchNearbyPlaces(null, category);
}
