export type VibeCategory = 'Food' | 'Art' | 'Spots' | 'Culture' | 'Night Owl';

export interface VibePlace {
  id: string;
  title: string;
  category: VibeCategory;
  description: string;
  image_url: string;
  lat: number;
  lng: number;
  pulse_intensity: number; // 1 to 10
  vq_reward: number;
  created_by: string;
  address: string;
}
