export type TimeOfDay = 'Morning' | 'Afternoon' | 'Sunset' | 'Night' | 'Flexible';

export interface TrailStop {
  id: string;
  name: string;
  address: string;
  vibeNote: string;
  timeOfDay: TimeOfDay;
  durationMinutes: number;
  lat?: number;
  lng?: number;
  vq_reward?: number;
  completed?: boolean;
}

// Backward-compatibility alias
export type TrailWaypoint = TrailStop & {
  order?: number;
  title?: string;
  description?: string;
  hint?: string;
};

export interface CommunityTrail {
  id: string;
  title: string;
  story: string;
  city: string;
  category: string;
  vibeTags: string[];
  imageUrl: string;
  durationHours: number;
  stopsCount: number;
  flowSequence: string[]; // e.g. ['🌅', '🌆', '🌙']
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  isTour?: boolean;
  pricePerPerson?: number;
  currency?: string;
  createdAt: string;
  difficulty?: 'Easy' | 'Moderate' | 'Legendary';
  vq_reward?: number;
  remix_count?: number;
  stops?: TrailStop[];
  // Backward compatibility fields
  description?: string;
  duration_mins?: number;
  distance_km?: number;
  image_url?: string;
  waypoints_count?: number;
  guardian_name?: string;
  guardian_handle?: string;
  guardian_avatar?: string;
  district?: string;
  waypoints?: TrailWaypoint[];
}

// Backward-compatibility alias
export type CulturalTrail = CommunityTrail;

export type GuardianType = 'pro' | 'local';

export interface VibeGuardian {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  selfieCapturedAt: string; // 7-day freshness timestamp
  type: GuardianType;
  city: string;
  age: number;
  bio: string;
  hourlyRate?: number;
  currency?: string;
  trustScore: number;
  hiresCount: number;
  offeredTrailTitle?: string;
  offeredTrailId?: string;
  isLive?: boolean;
  endorsementsCount?: number;
  // Backward-compatibility fields
  district?: string;
  tier?: string;
  avatar_url?: string;
  trust_score?: number;
  status?: 'active' | 'patrolling' | 'on_duty' | 'resting';
  specialty?: string;
  curated_trails_count?: number;
  curated_trail_ids?: string[];
  lat?: number;
  lng?: number;
  years_patrolling?: number;
}
