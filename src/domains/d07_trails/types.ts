export interface TrailWaypoint {
  title: string;
  lat: number;
  lng: number;
  hint: string;
}

export interface CulturalTrail {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Moderate' | 'Legendary';
  duration_mins: number;
  vq_reward: number;
  image_url: string;
  waypoints_count: number;
  guardian_name: string;
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
}

