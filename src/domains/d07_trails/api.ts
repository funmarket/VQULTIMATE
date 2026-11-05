import { supabase } from '../../lib/supabase';
import { CulturalTrail } from './types';

export const INITIAL_TRAILS: CulturalTrail[] = [
  {
    id: 'trail-1',
    title: 'The Spice & Silk Heritage Route',
    description: 'Trace the ancient pathways where dhow captains traded pearls for silk and cardamom.',
    difficulty: 'Easy',
    duration_mins: 45,
    vq_reward: 200,
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    waypoints_count: 5,
    guardian_name: 'Tariq Al-Mansoori'
  },
  {
    id: 'trail-2',
    title: 'Neon Marina Cyber Art Walk',
    description: 'Explore augmented reality murals and underground synth-wave installations along the waterfront.',
    difficulty: 'Moderate',
    duration_mins: 60,
    vq_reward: 350,
    image_url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=600&q=80',
    waypoints_count: 7,
    guardian_name: 'Layla Chen'
  },
  {
    id: 'trail-3',
    title: 'Midnight Dunes Stargazer Circuit',
    description: 'Venture beyond city light domes into quiet salt flats where tribal poetry echoes.',
    difficulty: 'Legendary',
    duration_mins: 120,
    vq_reward: 750,
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    waypoints_count: 4,
    guardian_name: 'Zainab Nuru'
  }
];

export async function fetchCulturalTrails(): Promise<CulturalTrail[]> {
  try {
    const { data, error } = await supabase.from('cultural_trails').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_TRAILS;
    }
    return data as CulturalTrail[];
  } catch {
    return INITIAL_TRAILS;
  }
}
