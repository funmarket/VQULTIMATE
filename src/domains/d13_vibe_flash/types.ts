export type VibeFlashCategory =
  | 'Secret Pop-up'
  | 'After-Hours'
  | 'Rooftop / Underground'
  | 'Live Music / DJ'
  | 'Flash Meetup'
  | 'House / Private Vibe'
  | 'Happy Hour'
  | 'Secret Set / DJ'
  | 'Pop-up Tasting'
  | 'Flash Hunt'
  | 'Meetup';

export interface VibeFlashEvent {
  id: string;
  source: 'flash' | 'meetup';
  kind: 'vibe_flash' | 'meetup_flash';
  place_id?: string;
  place_name: string;
  venue_name: string;
  address: string;
  title: string;
  description: string;
  category: VibeFlashCategory;
  vibe_type: VibeFlashCategory;
  creator_id: string;
  creator_handle: string;
  creator_name: string;
  creator_avatar?: string;
  lat: number;
  lng: number;
  starts_at: string;
  expires_at: string;
  vq_bounty: number;
  entry_type: string;
  entry_price_tnd?: string;
  max_capacity: number;
  interested_ids: string[];
  going_ids: string[];
  claimed_ids: string[];
  photo_url?: string;
  photoUrl?: string;
  photos?: string[];
  created_at: string;
}

export type VibeFlashItem = VibeFlashEvent;

export interface CreateVibeFlashInput {
  placeId?: string;
  placeName?: string;
  venueName?: string;
  address?: string;
  title: string;
  description: string;
  category?: VibeFlashCategory;
  vibeType?: VibeFlashCategory;
  creatorId: string;
  creatorHandle?: string;
  creatorName?: string;
  creatorAvatar?: string;
  lat: number;
  lng: number;
  startsAt?: string;
  expiresAt?: string;
  durationMinutes?: number;
  entryType?: string;
  entryPriceTnd?: string;
  entryRules?: string;
  parkingTransportNotes?: string;
  vqBounty?: number;
  vqHuntPool?: number;
  maxCapacity?: number;
  photoUrl?: string;
  photo_url?: string;
  photos?: string[];
  photoFile?: File;
}
