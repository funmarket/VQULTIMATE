import { supabase } from '../../lib/supabase';
import {  VibePlace,  VibeCategory,  DeviceLocationState,  UserCoordinates} from './types';

export const DISCOVERY_RADIUS_METERS = 8000; // 8 km leisure discovery scope

/** * Calculates great-circle distance between two coordinates in meters (Haversine formula). */export function calculateDistanceMeters(  lat1: number,  lon1: number,  lat2: number,  lon2: number): number {  const R = 6371e3; // Earth radius in meters  const φ1 = (lat1 * Math.PI) / 180;  const φ2 = (lat2 * Math.PI) / 180;  const Δφ = ((lat2 - lat1) * Math.PI) / 180;  const Δλ = ((lon2 - lon1) * Math.PI) / 180;  const a =    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));  return Math.round(R * c);}

/** * Requests device location once via navigator.geolocation.getCurrentPosition. */export function getDeviceLocation(): Promise<DeviceLocationState> {  return new Promise((resolve) => {    if (typeof window === 'undefined' || !navigator.geolocation) {      resolve({        status: 'unavailable',        coords: null,        error: 'Geolocation is not supported by your browser or environment.'      });      return;    }    navigator.geolocation.getCurrentPosition(      (position) => {        resolve({          status: 'granted',          coords: {            lat: position.coords.latitude,            lng: position.coords.longitude,            accuracy: position.coords.accuracy          }        });      },      (error) => {        let status: DeviceLocationState['status'] = 'unavailable';        let errorMsg = 'Unable to determine your position.';        if (error.code === error.PERMISSION_DENIED) {          status = 'denied';          errorMsg = 'Location permission was denied. Please allow location access in your browser settings to enable proximity discovery.';        } else if (error.code === error.POSITION_UNAVAILABLE) {          status = 'unavailable';          errorMsg = 'GPS sensor or location provider is unavailable.';        } else if (error.code === error.TIMEOUT) {          status = 'unavailable';          errorMsg = 'Location acquisition timed out.';        }        resolve({          status,          coords: null,          error: errorMsg        });      },      {        enableHighAccuracy: true,        timeout: 10000,        maximumAge: 30000      }    );  });}

/** * Continuously watches device location changes and informs subscriber. */export function watchDeviceLocation(  onUpdate: (state: DeviceLocationState) => void): () => void {  if (typeof window === 'undefined' || !navigator.geolocation) {    onUpdate({      status: 'unavailable',      coords: null,      error: 'Geolocation is not supported by this browser.'    });    return () => {};  }  const watchId = navigator.geolocation.watchPosition(    (position) => {      onUpdate({        status: 'granted',        coords: {          lat: position.coords.latitude,          lng: position.coords.longitude,          accuracy: position.coords.accuracy        }      });    },    (error) => {      let status: DeviceLocationState['status'] = 'unavailable';      let errorMsg = 'Location error occurred.';      if (error.code === error.PERMISSION_DENIED) {        status = 'denied';        errorMsg = 'Location access denied by user.';      } else if (error.code === error.POSITION_UNAVAILABLE) {        status = 'unavailable';        errorMsg = 'Location signal currently unavailable.';      } else if (error.code === error.TIMEOUT) {        status = 'location request timed out.';      }      onUpdate({        status,        coords: null,        error: errorMsg      });    },    {      enableHighAccuracy: true,      timeout: 15000,      maximumAge: 10000    }  );  return () => {    navigator.geolocation.clearWatch(watchId);  };}

/** * Public domain API: Fetches real nearby places from the Supabase Edge Function 'nearby-places' * and enriches them with real database rows from Supabase (promotions, validations, check-ins, meetups). */export async function fetchNearbyPlaces(  coords: UserCoordinates | null,  category?: VibeCategory | 'All'): Promise<VibePlace[]> {  let targetCoords = coords;  if (!targetCoords || isNaN(targetCoords.lat) || isNaN(targetCoords.lng)) {    const locState = await getDeviceLocation();    if (locState.status === 'granted' && locState.coords) {      targetCoords = locState.coords;    }  }  if (!targetCoords || isNaN(targetCoords.lat) || isNaN(targetCoords.lng)) {    return [];  }  try {    const selectedCategory = category || 'All';    const { data, error } = await supabase.functions.invoke('nearby-places', {      body: {        lat: targetCoords.lat,        lng: targetCoords.lng,
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

    const rawPlaces = data.places;
    const placeIds = rawPlaces.map((p: any) => p.id).filter(Boolean);

    let promoMap: Record<string, any> = {};
    let validationSummaryMap: Record<string, { avg: number; count: number }> = {};
    let checkinCountMap: Record<string, number> = {};
    let meetupCountMap: Record<string, number> = {};

    if (placeIds.length > 0) {
      const [promosRes, validationsRes, checkinsRes, meetupsRes] = await Promise.all([
        supabase.from('place_promotions').select('*').in('place_id', placeIds).eq('status', 'active'),
        supabase.from('place_validations').select('place_id, resulting_confidence').in('place_id', placeIds),
        supabase.from('place_checkins').select('place_id').in('place_id', placeIds),
        supabase.from('place_meetups').select('place_id, expires_at').in('place_id', placeIds).gt('expires_at', new Date().toISOString())
      ]);

      if (promosRes.data) {
        promosRes.data.forEach((r: any) => {
          if (r.remaining_vq_pool >= (r.reward_per_checkin || 500)) {
            promoMap[r.place_id] = r;
          }
        });
      }

      if (validationsRes.data) {
        const grouped: Record<string, number[]> = {};
        validationsRes.data.forEach((r: any) => {
          if (!grouped[r.place_id]) grouped[r.place_id] = [];
          if (typeof r.resulting_confidence === 'number') {
            grouped[r.place_id].push(r.resulting_confidence);
          }
        });
        Object.entries(grouped).forEach(([pid, confs]) => {
          const sum = confs.reduce((a, b) => a + b, 0);
          validationSummaryMap[pid] = {
            avg: Math.round(sum / confs.length),
            count: confs.length
          };
        });
      }

      if (checkinsRes.data) {
        checkinsRes.data.forEach((r: any) => {
          checkinCountMap[r.place_id] = (checkinCountMap[r.place_id] || 0) + 1;
        });
      }

      if (meetupsRes.data) {
        meetupsRes.data.forEach((r: any) => {
          meetupCountMap[r.place_id] = (meetupCountMap[r.place_id] || 0) + 1;
        });
      }
    }

    const places: VibePlace[] = rawPlaces.map((p: any) => {
      const dist =
        typeof p.distance_meters === 'number'
          ? p.distance_meters
          : calculateDistanceMeters(targetCoords!.lat, targetCoords!.lng, p.lat, p.lng);

      const promo = promoMap[p.id];
      const valSum = validationSummaryMap[p.id];
      const checkins = checkinCountMap[p.id] || 0;
      const meetups = meetupCountMap[p.id] || 0;

      const isPromoted = Boolean(promo && promo.remaining_vq_pool >= promo.reward_per_checkin);
      const vqReward = isPromoted ? Number(promo.reward_per_checkin || 500) : undefined;
      const promotionPool = isPromoted ? Number(promo.remaining_vq_pool || 0) : undefined;
      const vibeConfidence = valSum ? valSum.avg : (p.vibe_confidence ?? undefined);
      const confirmationsCount = valSum ? valSum.count : (p.confirmations_count ?? 0);

      return {
        ...p,
        distance_meters: dist,
        distance_km: Number((dist / 1000).toFixed(2)),
        is_promoted: isPromoted,
        vq_reward: vqReward,
        promotion_pool: promotionPool,
        vibe_confidence: vibeConfidence,
        confirmations_count: confirmationsCount,
        checkins_count: checkins,
        active_meetups_count: meetups
      };
    });

    return places;
  } catch (err) {
    console.warn('fetchNearbyPlaces failure:', err);
    return [];
  }
}

export const fetchNearbyVibeVibePlaces = fetchNearbyPlaces;
export const fetchNearbyVibePlaces = fetchNearbyPlaces;

export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  return fetchNearbyPlaces(null, category);
}
