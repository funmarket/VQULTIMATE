import { supabase } from '../../lib/supabase';
import { Guardian } from './types';

export const INITIAL_GUARDIANS: Guardian[] = [
  {
    id: 'g-1',
    name: 'Tariq Al-Mansoori',
    district: 'Old Quarter & Souk',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    badge: 'Master Sentinel',
    status: 'active',
    trustScore: 99,
    lat: 25.2048,
    lng: 55.2708
  },
  {
    id: 'g-2',
    name: 'Layla Chen',
    district: 'Arts & Marina District',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    badge: 'Vibe Curator',
    status: 'patrolling',
    trustScore: 95,
    lat: 25.2150,
    lng: 55.2850
  },
  {
    id: 'g-3',
    name: 'Zainab Nuru',
    district: 'Neon Dunes & Oasis',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    badge: 'Trail Pathfinder',
    status: 'active',
    trustScore: 97,
    lat: 25.1950,
    lng: 55.2500
  }
];

export async function fetchGuardians(): Promise<Guardian[]> {
  try {
    const { data, error } = await supabase.from('guardians').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_GUARDIANS;
    }
    return data as Guardian[];
  } catch {
    return INITIAL_GUARDIANS;
  }
}
