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
