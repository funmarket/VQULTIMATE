import { supabase } from '@/lib/supabase';
import {
  VibePlace,
  VibeCategory,
  DeviceLocationState,
  UserCoordinates
} from './types';

export const DISCOVERY_RADIUS_METERS = 23000; // 23 km leisure discovery scope

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
 * and enriches each place from Supabase tables (place_promotions, place_validations, place_checkins, place_meetups).
 */
export async function fetchNearbyPlaces(
  coords: UserCoordinates | null,
  category?: VibeCategory | 'All'
): Promise<VibePlace[]> {
  let targetCoords = coords;

  if (!targetCoords || isNaN(targetCoords.lat) || isNaN(targetCoords.lng)) {
    const locState = await getDeviceLocation();
    if (locState.status === 'granted' && locState.coords) {
      targetCoords = locState.coords;
    }
  }

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

    const placeIds: string[] = data.places.map((p: any) => p.id).filter(Boolean);

    const promoMap: Record<string, { reward: number; pool: number }> = {};
    const valMap: Record<string, { latestConfidence: number; count: number }> = {};
    const checkinCounts: Record<string, number> = {};

    if (placeIds.length > 0) {
      const [promosRes, valsRes, checkinsRes] = await Promise.all([
        supabase
          .from('place_promotions')
          .select('place_id, remaining_vq_pool, reward_per_checkin, status')
          .in('place_id', placeIds)
          .eq('status', 'active'),
        supabase
          .from('place_validations')
          .select('place_id, resulting_confidence, confidence_score, created_at')
          .in('place_id', placeIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('place_checkins')
          .select('place_id')
          .in('place_id', placeIds)
      ]);

      if (!promosRes.error && Array.isArray(promosRes.data)) {
        promosRes.data.forEach((row: any) => {
          const pool = Number(row.remaining_vq_pool || 0);
          const reward = Number(row.reward_per_checkin || 500);
          if (row.place_id && pool >= reward) {
            promoMap[row.place_id] = { reward, pool };
          }
        });
      }

      if (!valsRes.error && Array.isArray(valsRes.data)) {
        // Because rows are ordered by created_at ASC, the last row seen per place_id holds the latest cumulative resulting_confidence
        valsRes.data.forEach((row: any) => {
          const pid = row.place_id;
          const conf = Number(row.resulting_confidence ?? row.confidence_score ?? 80);
          if (pid && !isNaN(conf)) {
            if (!valMap[pid]) {
              valMap[pid] = { latestConfidence: conf, count: 0 };
            }
            valMap[pid].latestConfidence = conf;
            valMap[pid].count += 1;
          }
        });
      }

      if (!checkinsRes.error && Array.isArray(checkinsRes.data)) {
        checkinsRes.data.forEach((row: any) => {
          if (row.place_id) {
            checkinCounts[row.place_id] = (checkinCounts[row.place_id] || 0) + 1;
          }
        });
      }
    }

    const places: VibePlace[] = data.places.map((p: any) => {
      const dist =
        typeof p.distance_meters === 'number'
          ? p.distance_meters
          : calculateDistanceMeters(targetCoords!.lat, targetCoords!.lng, p.lat, p.lng);

      const promo = promoMap[p.id];
      const valInfo = valMap[p.id];
      const chkCount = checkinCounts[p.id] || 0;

      return {
        ...p,
        distance_meters: dist,
        distance_km: Number((dist / 1000).toFixed(2)),
        reviews_count: typeof p.reviews_count === 'number' ? p.reviews_count : undefined,
        is_promoted: Boolean(promo),
        vq_reward: promo ? promo.reward : undefined,
        promotion_pool: promo ? promo.pool : undefined,
        vibe_confidence: valInfo && valInfo.count > 0 ? Math.round(valInfo.latestConfidence) : undefined,
        confirmations_count: valInfo ? valInfo.count : 0,
        checkins_count: chkCount
      };
    });

    return places;
  } catch (err) {
    console.warn('fetchNearbyPlaces failure:', err);
    return [];
  }
}

export const fetchNearbyVibePlaces = fetchNearbyPlaces;

export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  return fetchNearbyPlaces(null, category);
}
