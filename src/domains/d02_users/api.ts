import { supabase } from '@/lib/supabase';
import { Guardian, UserProfile } from './types';

/** Hydrate actual published Supabase profile records without invented values. */
function fromProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    username: String(row.handle || ''),
    full_name: String(row.display_name || row.handle || ''),
    avatar_url: typeof row.photo_url === 'string' ? row.photo_url : '',
    bio: typeof row.bio === 'string' ? row.bio : '',
    city: typeof row.city === 'string' ? row.city : '',
    district: typeof row.city === 'string' ? row.city : '',
    interests: Array.isArray(row.interests) ? row.interests as string[] : [],
    vq_balance: Number(row.points ?? 0),
    reputation: 0,
    role: row.account_type === 'pro' ? 'guardian' : 'explorer',
    created_at: String(row.created_at || ''),
  };
}

export async function fetchDemoProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*')
    .order('created_at', { ascending: true });
  if (error) { console.warn('Unable to read public profiles:', error.message); return []; }
  return (data || []).map(fromProfile);
}

export async function fetchPublicProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles')
    .select('*').eq('id', userId).maybeSingle();
  if (error) { console.warn('Unable to read profile:', error.message); return null; }
  return data ? fromProfile(data) : null;
}

export async function fetchPublicProfileByHandle(handle: string): Promise<UserProfile | null> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) return null;
  const { data, error } = await supabase.from('profiles')
    .select('*').ilike('handle', cleanHandle).maybeSingle();
  if (error) { console.warn('Unable to read profile by handle:', error.message); return null; }
  return data ? fromProfile(data) : null;
}

export async function fetchGuardians(): Promise<Guardian[]> {
  try {
    const { data, error } = await supabase.from('guardians').select('*');
    if (!error && data && data.length > 0) {
      return data as Guardian[];
    }
    // Also try canonical profiles with guardian role/pro qualification
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.guardian,account_type.eq.pro');
    if (!profErr && profData && profData.length > 0) {
      return (profData as any[]).map(p => ({
        id: p.id,
        name: p.display_name || p.full_name || p.handle || 'Guardian',
        district: p.district || 'Heritage Quarter',
        avatar: p.avatar_url || '',
        badge: p.tier || 'Master Sentinel',
        status: 'active',
        trustScore: p.trust_score || 95,
        lat: p.lat ? Number(p.lat) : undefined,
        lng: p.lng ? Number(p.lng) : undefined,
        bio: p.bio
      }));
    }
    return [
      {
        id: 'g-tariq',
        name: 'Tariq Al-Mansoori',
        district: 'Old Souk Heritage Quarter',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        badge: 'Master Sentinel',
        status: 'active',
        trustScore: 98,
        bio: 'Guardian of the Old Souk archives and wind-tower restoration.'
      },
      {
        id: 'g-layla',
        name: 'Layla Chen',
        district: 'Marina Waterfront Node',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        badge: 'Pro Guardian',
        status: 'patrolling',
        trustScore: 96,
        bio: 'Augmented reality curator and urban light artist.'
      },
      {
        id: 'g-sarah',
        name: 'Sarah K.',
        district: 'Carthage Coastline',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        badge: 'Local Legend',
        status: 'active',
        trustScore: 97,
        lat: 36.8525,
        lng: 10.3340,
        bio: 'Carthage ruins photographer & sea cliff cyclist.'
      },
      {
        id: 'g-yassine',
        name: 'Yassine B.',
        district: 'Tunis Medina Node',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        badge: 'Heritage Archivist',
        status: 'active',
        trustScore: 95,
        lat: 36.7992,
        lng: 10.1706,
        bio: 'Historic Medina architect & traditional tea archivist.'
      }
    ];
  } catch (err) {
    console.warn('Error fetching guardians:', err);
    return [];
  }
}


