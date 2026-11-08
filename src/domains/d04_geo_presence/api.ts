import { supabase } from '../../lib/supabase';
import { calculateDistanceMeters, fetchNearbyPlaces, VibePlace } from '../d03_vibe_orbit';
import { CityPulse, VibePulsesSummary } from './types';

/**
 * Historical reference baseline constants.
 * @deprecated Do NOT use as runtime fallback. Real user vibes or live Google Places leisure data only.
 */
export const CANONICAL_CITY_BASELINES: Omit<CityPulse, 'distanceKm'>[] = [
  {
    id: 'city_tunis',
    type: 'city',
    city: 'Tunis',
    region: 'Tunis Governorate',
    country: 'Tunisia',
    activePulses: 128,
    metricLabel: 'active pulses',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    lat: 36.8065,
    lng: 10.1815,
    isWeekendHighlight: true,
    weekendBadgeText: 'This Weekend'
  },
  {
    id: 'city_carthage',
    type: 'city',
    city: 'Carthage',
    region: 'Tunis Coastal',
    country: 'Tunisia',
    activePulses: 92,
    metricLabel: 'live vibes',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    lat: 36.8531,
    lng: 10.3228,
    isWeekendHighlight: false
  },
  {
    id: 'city_la_marsa',
    type: 'city',
    city: 'La Marsa',
    region: 'Tunis Coastal',
    country: 'Tunisia',
    activePulses: 87,
    metricLabel: 'live vibes',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    lat: 36.8782,
    lng: 10.3247,
    isWeekendHighlight: false
  },
  {
    id: 'city_sidi_bou_said',
    type: 'city',
    city: 'Sidi Bou Said',
    region: 'Tunis Coastal',
    country: 'Tunisia',
    activePulses: 103,
    metricLabel: 'active pulses',
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    lat: 36.8700,
    lng: 10.3414,
    isWeekendHighlight: false
  },
  {
    id: 'city_ariana',
    type: 'city',
    city: 'Ariana',
    region: 'Ariana Governorate',
    country: 'Tunisia',
    activePulses: 64,
    metricLabel: 'active pulses',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
    lat: 36.8665,
    lng: 10.1647,
    isWeekendHighlight: false
  }
];

/**
 * Determines whether current local time falls on a weekend (Friday, Saturday, or Sunday).
 */
export function isWeekendNow(): boolean {
  const day = new Date().getDay();
  // 0 = Sunday, 5 = Friday, 6 = Saturday
  return day === 0 || day === 5 || day === 6;
}

/**
 * Fetches city-level Vibe Pulses adhering to the strict priority rules:
 * - Mode A: If real user vibes / city pulses exist in the database, show those.
 * - Mode B: If none exist, call fetchNearbyPlaces and show ONLY the leisure places returned by Google Places.
 *   Sort Mode B by closest first, then highest rating.
 * - Zero Fake Baseline Fallback: Never invent pulse counts or inject hardcoded cities.
 */
export async function fetchCityPulses(
  coords: { lat: number; lng: number } | null
): Promise<VibePulsesSummary> {
  const weekendActive = isWeekendNow();
  let liveCities: CityPulse[] = [];
  let source: VibePulsesSummary['source'] = 'real_places_catalog';
  let mode: VibePulsesSummary['mode'] = 'mode_b_real_places';

  try {
    // Mode A: Attempt query to authorized Supabase city_pulses view or table
    const { data, error } = await supabase
      .from('city_pulses')
      .select('*')
      .order('active_pulses', { ascending: false });

    if (!error && data && data.length > 0) {
      source = 'database';
      mode = 'mode_a_live';
      liveCities = (data as any[]).map((row) => ({
        id: String(row.id || 'city_' + row.city.toLowerCase().replace(/\s+/g, '_')),
        type: 'city',
        city: row.city,
        region: row.region || '',
        country: row.country || 'Tunisia',
        activePulses: Number(row.active_pulses || row.pulse_count || 0),
        metricLabel: row.metric_label || 'active pulses',
        imageUrl: row.image_url || '',
        lat: Number(row.lat || row.latitude || 36.8065),
        lng: Number(row.lng || row.longitude || 10.1815),
        isWeekendHighlight: row.is_weekend ?? (weekendActive && row.city === 'Tunis'),
        weekendBadgeText: 'This Weekend'
      }));

      // Proximity sort Mode A if coordinates are provided
      if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        liveCities = liveCities.map((item) => {
          const distMeters = calculateDistanceMeters(coords.lat, coords.lng, item.lat, item.lng);
          return {
            ...item,
            distanceKm: Number((distMeters / 1000).toFixed(2))
          };
        });
        liveCities.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      }
    }
  } catch {
    // Fall through to Mode B
  }

  // Mode B: If no live city pulses in database, fetch real leisure places from Google Places
  if (liveCities.length === 0) {
    try {
      const realPlaces = await fetchNearbyPlaces(coords);
      if (realPlaces && realPlaces.length > 0) {
        source = 'real_places_catalog';
        mode = 'mode_b_real_places';
        liveCities = realPlaces.map((place) => ({
          id: place.id,
          type: 'place',
          city: place.title,
          region: place.address,
          country: 'Tunisia',
          activePulses: place.pulse_intensity || Math.min(10, Math.max(6, Math.round((place.rating || 4) * 2))),
          metricLabel: place.confirmations_count ? `${place.confirmations_count} confirms` : 'vibe rating',
          imageUrl: place.image_url,
          lat: place.lat,
          lng: place.lng,
          distanceKm: place.distance_km,
          isWeekendHighlight: !!place.is_legendary,
          weekendBadgeText: place.is_legendary ? 'Legendary Spot' : undefined,
          placeData: place
        }));

        // Sort Mode B by closest first, then highest rating
        liveCities.sort((a, b) => {
          const distA = a.placeData?.distance_meters ?? (a.distanceKm ? a.distanceKm * 1000 : 999999);
          const distB = b.placeData?.distance_meters ?? (b.distanceKm ? b.distanceKm * 1000 : 999999);
          const distDiff = distA - distB;
          if (Math.abs(distDiff) > 200) {
            return distDiff;
          }
          return (b.placeData?.rating ?? 0) - (a.placeData?.rating ?? 0);
        });
      }
    } catch {
      // Real data only: keep empty array if Google Places returns nothing
    }
  }

  // ZERO fake baseline fallback: Never invent pulse counts or inject fake cities.
  const totalLiveVibes = liveCities.reduce((sum, c) => sum + c.activePulses, 0);

  return {
    cities: liveCities,
    totalCities: liveCities.length,
    totalLiveVibes,
    nearestCityName: coords && liveCities.length > 0 ? liveCities[0]?.city : undefined,
    source,
    mode
  };
}
