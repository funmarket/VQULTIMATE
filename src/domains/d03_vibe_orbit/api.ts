import { supabase } from '../../lib/supabase';
import { VibePlace, VibeCategory } from './types';

export async function fetchVibePlaces(category?: VibeCategory): Promise<VibePlace[]> {
  try {
    let query = supabase.from('vibe_places').select('*');
    if (category && category !== ('All' as any)) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Also try fallback query on canonical 'places' table if vibe_places view is not populated
      const { data: placesData, error: placesErr } = await supabase.from('places').select('*');
      if (!placesErr && placesData && placesData.length > 0) {
        let mapped = (placesData as any[]).map(p => ({
          id: p.id,
          title: p.title || p.name || 'Vibe Waypoint',
          category: p.category || 'Spots',
          description: p.description || '',
          image_url: p.image_url || p.cover_image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
          lat: p.lat || p.latitude || 25.2048,
          lng: p.lng || p.longitude || 55.2708,
          pulse_intensity: p.pulse_intensity || 8,
          vq_reward: p.vq_reward || 50,
          created_by: p.created_by || 'guardian',
          address: p.address || 'Heritage Node'
        }));
        if (category && category !== ('All' as any)) {
          mapped = mapped.filter(p => p.category === category);
        }
        return mapped as VibePlace[];
      }
      return [];
    }
    return data as VibePlace[];
  } catch (err) {
    console.warn('Error fetching vibe places:', err);
    return [];
  }
}

