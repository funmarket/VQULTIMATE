import { supabase } from '../../lib/supabase';
import { CulturalTrail, VibeGuardian } from './types';

export async function fetchCulturalTrails(): Promise<CulturalTrail[]> {
  try {
    const { data, error } = await supabase.from('cultural_trails').select('*');
    if (!error && data && data.length > 0) {
      return data as CulturalTrail[];
    }
    // Also try canonical vibe_trails table
    const { data: vTrails, error: vErr } = await supabase.from('vibe_trails').select('*');
    if (!vErr && vTrails && vTrails.length > 0) {
      return (vTrails as any[]).map(t => ({
        id: t.id,
        title: t.title || t.name || 'Cultural Trail',
        description: t.description || '',
        difficulty: t.difficulty || 'Moderate',
        duration_mins: t.duration_mins || 45,
        vq_reward: t.vq_reward || 150,
        image_url: t.image_url || t.cover_image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        waypoints_count: t.waypoints_count || t.stops_count || 3,
        guardian_name: t.author_name || t.guardian_name || 'District Guardian'
      }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching cultural trails:', err);
    return [];
  }
}

export async function fetchVibeGuardians(): Promise<VibeGuardian[]> {
  try {
    const { data, error } = await supabase.from('vibe_guardians').select('*');
    if (!error && data && data.length > 0) {
      return data as VibeGuardian[];
    }
    // Try querying profiles with guardian role/qualification
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.guardian,account_type.eq.pro');
    if (!profErr && profData && profData.length > 0) {
      return (profData as any[]).map(p => ({
        id: p.id,
        name: p.display_name || p.full_name || p.handle || 'Guardian',
        handle: '@' + (p.handle || p.username || 'guardian'),
        district: p.district || 'Heritage Quarter',
        tier: p.tier || 'PRO GUARDIAN',
        avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: p.bio || 'District guardian and cultural curator.',
        trust_score: p.trust_score || 95
      }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching vibe guardians:', err);
    return [];
  }
}


