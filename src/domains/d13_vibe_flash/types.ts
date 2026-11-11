/**
 * Vibe Flash Domain Types
 * Unified model for Secret/After-Hours Flash Events and Venue Meetups starting within <= 60m.
 */

export type VibeFlashKind = 'secret_flash' | 'meetup_flash';

export type VibeFlashCategory =
  | 'After-Hours'
  | 'Secret Pop-up'
  | 'Rooftop / Underground'
  | 'Live Music / DJ'
  | 'Flash Meetup'
  | 'House / Private Vibe';

export interface VibeFlashItem {
  id: string;
  kind: VibeFlashKind;
  title: string;
  description: string;
  vibe_type: VibeFlashCategory;
  place_id?: string;
  venue_name: string;
  address: string;
  lat: number;
  lng: number;
  distance_meters?: number;
  distance_km?: number;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  starts_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
  entry_type: 'Free' | 'Paid' | 'Guestlist / Password';
  entry_price_tnd?: string;
  entry_rules?: string;
  parking_transport_notes?: string;
  photos?: string[];
  photo_url?: string;
  vq_hunt_pool: number;
  vq_reward_per_hunter: number; // default 500 VQ
  max_capacity: number; // default 10 for meetups, 10-100 for flashes
  interested_ids: string[];
  going_ids: string[];
  verified_arrived_ids: string[];
  claimed_reward_ids: string[];
  created_at: string;
}

export interface CreateVibeFlashPayload {
  title: string;
  description: string;
  vibeType: VibeFlashCategory;
  placeId?: string;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  startsAt: string;
  durationMinutes: number; // 60, 120, 180
  entryType: 'Free' | 'Paid' | 'Guestlist / Password';
  entryPriceTnd?: string;
  entryRules?: string;
  parkingTransportNotes?: string;
  photos?: string[];
  photo_url?: string;
  vqHuntPool?: number;
  maxCapacity?: number;
}
