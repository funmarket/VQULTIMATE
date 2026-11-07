import { VibePlace } from '../d03_vibe_orbit';

export type VibePulseCardType = 'city' | 'place' | 'promotional_ad';

export interface CityPulse {
  id: string;
  type: VibePulseCardType;
  city: string;
  region?: string;
  country?: string;
  activePulses: number;
  metricLabel: string; // e.g. "active pulses", "live vibes", "confirmations", "vibe intensity"
  imageUrl: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  isWeekendHighlight?: boolean;
  weekendBadgeText?: string;
  lastUpdated?: string;
  isBookmarked?: boolean;
  placeData?: VibePlace;
  adData?: {
    sponsorName: string;
    headline: string;
    ctaText: string;
    ctaUrl: string;
  };
}

export interface VibePulsesSummary {
  cities: CityPulse[];
  totalCities: number;
  totalLiveVibes: number;
  nearestCityName?: string;
  source: 'database' | 'calculated_baseline' | 'real_places_catalog';
  mode?: 'mode_a_live' | 'mode_b_real_places' | 'mode_c_mixed';
}
