import { supabase } from '../../lib/supabase';
import { CulturalTrail, VibeGuardian } from './types';

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

export const INITIAL_GUARDIANS: VibeGuardian[] = [
  {
    id: 'g-1',
    name: 'Tariq Al-Mansoori',
    handle: '@tariq_guardian',
    district: 'Dubai Creek & Heritage District',
    tier: 'Supreme Guardian',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Master cartographer of ancient trade routes and maritime lore.',
    trust_score: 99
  },
  {
    id: 'g-2',
    name: 'Layla Chen',
    handle: '@layla_synth',
    district: 'Marina & Neon Waterfront',
    tier: 'Pro Guardian',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Curator of augmented reality synth installations and night markets.',
    trust_score: 96
  },
  {
    id: 'g-3',
    name: 'Zainab Nuru',
    handle: '@zainab_dunes',
    district: 'Al Quoz Industrial Arts Quarter',
    tier: 'Cultural Guide',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    bio: 'Sculptor, coffee connoisseur, and subterranean gallery founder.',
    trust_score: 94
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

export async function fetchVibeGuardians(): Promise<VibeGuardian[]> {
  try {
    const { data, error } = await supabase.from('vibe_guardians').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_GUARDIANS;
    }
    return data as VibeGuardian[];
  } catch {
    return INITIAL_GUARDIANS;
  }
}

