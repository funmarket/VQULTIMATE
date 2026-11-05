import { supabase } from '../../lib/supabase';
import { VibePlace, VibeCategory } from './types';

export const INITIAL_PLACES: VibePlace[] = [
  {
    id: 'place-1',
    title: 'Neon Spice Souk Rooftop',
    category: 'Food',
    description: 'Traditional cardamom brew with modern electronic ambient beats under the stars.',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    lat: 25.2048,
    lng: 55.2708,
    pulse_intensity: 9,
    vq_reward: 50,
    created_by: 'tariq_guardian',
    address: 'Al Fahidi Historical Neighborhood'
  },
  {
    id: 'place-2',
    title: 'Holographic Alley Mural',
    category: 'Art',
    description: 'Augmented reality street art telling the tale of the pearl divers and future stargazers.',
    image_url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=600&q=80',
    lat: 25.2100,
    lng: 55.2780,
    pulse_intensity: 8,
    vq_reward: 75,
    created_by: 'layla_vibes',
    address: 'Design District Way 42'
  },
  {
    id: 'place-3',
    title: 'Midnight Salt Flats Observatory',
    category: 'Spots',
    description: 'Secluded stargazing outcrop with zero light pollution and panoramic city skyline reflections.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    lat: 25.1850,
    lng: 55.2500,
    pulse_intensity: 10,
    vq_reward: 100,
    created_by: 'vq_admin',
    address: 'Ras Al Khor Wetlands Edge'
  },
  {
    id: 'place-4',
    title: 'Ancient Poetry Vault',
    category: 'Culture',
    description: 'Immersive acoustic hall where centuries-old Bedouin verses echo in 3D surround sound.',
    image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    lat: 25.2150,
    lng: 55.2900,
    pulse_intensity: 7,
    vq_reward: 60,
    created_by: 'tariq_guardian',
    address: 'Heritage Village Sector C'
  },
  {
    id: 'place-5',
    title: 'Neon Crypt Lounge',
    category: 'Night Owl',
    description: 'Underground subterranean vinyl lounge playing rare synth-wave and desert techno.',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    lat: 25.1980,
    lng: 55.2650,
    pulse_intensity: 9,
    vq_reward: 80,
    created_by: 'layla_vibes',
    address: 'Financial Center Sub-Level 2'
  }
];

export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  try {
    let query = supabase.from('vibe_places').select('*');
    if (category && category !== ('All' as any)) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (category && category !== ('All' as any)) {
        return INITIAL_PLACES.filter(p => p.category === category);
      }
      return INITIAL_PLACES;
    }
    return data as VibePlace[];
  } catch {
    if (category && category !== ('All' as any)) {
      return INITIAL_PLACES.filter(p => p.category === category);
    }
    return INITIAL_PLACES;
  }
}
