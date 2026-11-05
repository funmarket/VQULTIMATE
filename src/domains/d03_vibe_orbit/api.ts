import { supabase } from '../../lib/supabase';
import {
  VibePlace,
  VibeCategory,
  DeviceLocationState,
  UserCoordinates
} from './types';

export const DISCOVERY_RADIUS_METERS = 23000; // 23 km scope

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
          errorMsg = 'Location permission was denied. Please allow location access in your browser settings to enable the 23 km Vibe Orbit radar.';
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
 * Returns an unwatch cleanup function.
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
        errorMsg = 'Location access denied by user. Enable GPS in browser settings to scan your 23 km orbit.';
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
 * Queries real places within 23 km (23,000 meters) of the user's coordinates.
 * Zero-mock discipline: If no device location or no places in range, returns empty array.
 */
export async function fetchNearbyVibePlaces(
  coords: UserCoordinates | null,
  category?: VibeCategory | 'All'
): Promise<VibePlace[]> {
  if (!coords) {
    return [];
  }

  try {
    // 1. Attempt PostGIS / Supabase RPC query if provisioned
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_nearby_places', {
      user_lat: coords.lat,
      user_lng: coords.lng,
      radius_meters: DISCOVERY_RADIUS_METERS
    });

    if (!rpcErr && rpcData && Array.isArray(rpcData)) {
      let mapped = (rpcData as any[]).map((p) => {
        const placeLat = Number(p.lat ?? p.latitude);
        const placeLng = Number(p.lng ?? p.longitude);
        const dist = calculateDistanceMeters(coords.lat, coords.lng, placeLat, placeLng);
        return {
          id: p.id,
          title: p.title || p.name || 'Vibe Waypoint',
          category: (p.category || 'Spots') as VibeCategory,
          description: p.description || '',
          image_url: p.image_url || p.cover_image || '',
          lat: placeLat,
          lng: placeLng,
          pulse_intensity: p.pulse_intensity || 8,
          vq_reward: p.vq_reward || 50,
          created_by: p.created_by || 'explorer',
          address: p.address || `${(dist / 1000).toFixed(1)} km away`,
          distance_meters: dist,
          distance_km: Number((dist / 1000).toFixed(1))
        };
      });

      if (category && category !== 'All') {
        mapped = mapped.filter((p) => p.category === category);
      }

      return mapped.filter((p) => p.distance_meters <= DISCOVERY_RADIUS_METERS);
    }

    // 2. Fallback query on canonical 'places' table with client-side Haversine filtering
    let query = supabase.from('places').select('*');
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const withinRadius: VibePlace[] = [];

      for (const row of data as any[]) {
        const placeLat = Number(row.lat ?? row.latitude);
        const placeLng = Number(row.lng ?? row.longitude);

        if (isNaN(placeLat) || isNaN(placeLng)) continue;

        const dist = calculateDistanceMeters(coords.lat, coords.lng, placeLat, placeLng);
        if (dist <= DISCOVERY_RADIUS_METERS) {
          withinRadius.push({
            id: row.id,
            title: row.title || row.name || 'Vibe Waypoint',
            category: (row.category || 'Spots') as VibeCategory,
            description: row.description || '',
            image_url: row.image_url || row.cover_image || '',
            lat: placeLat,
            lng: placeLng,
            pulse_intensity: row.pulse_intensity || 8,
            vq_reward: row.vq_reward || 50,
            created_by: row.created_by || 'explorer',
            address: row.address || `${(dist / 1000).toFixed(1)} km away`,
            distance_meters: dist,
            distance_km: Number((dist / 1000).toFixed(1))
          });
        }
      }

      withinRadius.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
      return withinRadius;
    }

    // Also check 'vibe_places' if places returned empty
    const { data: vpData, error: vpErr } = await supabase.from('vibe_places').select('*');
    if (!vpErr && vpData && vpData.length > 0) {
      const withinRadius: VibePlace[] = [];

      for (const row of vpData as any[]) {
        const placeLat = Number(row.lat ?? row.latitude);
        const placeLng = Number(row.lng ?? row.longitude);

        if (isNaN(placeLat) || isNaN(placeLng)) continue;

        const dist = calculateDistanceMeters(coords.lat, coords.lng, placeLat, placeLng);
        if (dist <= DISCOVERY_RADIUS_METERS) {
          withinRadius.push({
            id: row.id,
            title: row.title || row.name || 'Vibe Waypoint',
            category: (row.category || 'Spots') as VibeCategory,
            description: row.description || '',
            image_url: row.image_url || row.cover_image || '',
            lat: placeLat,
            lng: placeLng,
            pulse_intensity: row.pulse_intensity || 8,
            vq_reward: row.vq_reward || 50,
            created_by: row.created_by || 'explorer',
            address: row.address || `${(dist / 1000).toFixed(1)} km away`,
            distance_meters: dist,
            distance_km: Number((dist / 1000).toFixed(1))
          });
        }
      }

      if (category && category !== 'All') {
        return withinRadius.filter((p) => p.category === category);
      }
      return withinRadius;
    }

    return [];
  } catch (err) {
    console.warn('Error querying nearby vibe places:', err);
    return [];
  }
}

/**
 * Backward-compatible export. If coords cannot be resolved, returns empty.
 */
export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  return fetchNearbyVibePlaces(null, category);
}
