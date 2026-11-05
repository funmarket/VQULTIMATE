export interface TrailWaypoint {
  id: string;
  order: number;
  title: string;
  description: string;
  lat?: number;
  lng?: number;
  hint?: string;
  vq_reward: number;
  completed?: boolean;
}

export interface CulturalTrail {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Moderate' | 'Legendary';
  duration_mins: number;
  distance_km?: number;
  category?: string;
  vq_reward: number;
  image_url: string;
  waypoints_count: number;
  guardian_name: string;
  guardian_handle?: string;
  guardian_avatar?: string;
  district?: string;
  remix_count?: number;
  original_author?: string;
  waypoints?: TrailWaypoint[];
}

export interface VibeGuardian {
  id: string;
  name: string;
  handle: string;
  district: string;
  tier: string;
  avatar_url: string;
  bio: string;
  trust_score: number;
  status?: 'active' | 'patrolling' | 'on_duty' | 'resting';
  specialty?: string;
  curated_trails_count?: number;
  curated_trail_ids?: string[];
  lat?: number;
  lng?: number;
  years_patrolling?: number;
}

