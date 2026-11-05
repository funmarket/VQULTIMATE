import { supabase } from '../../lib/supabase';
import { Guardian, UserProfile } from './types';

export async function fetchDemoProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      username: row.handle || row.username || 'explorer',
      full_name: row.display_name || row.full_name || 'Explorer',
      avatar_url: row.avatar_url || row.avatar || '',
      bio: row.bio || '',
      district: row.district || 'Heritage Node',
      vq_balance: row.vq_balance || 0,
      reputation: row.reputation || 0,
      role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
      tier: row.tier || (row.role === 'admin' ? 'ADMIN SENTINEL' : 'EXPLORER'),
      trust_score: row.trust_score || 90,
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Error querying profiles:', err);
    return [];
  }
}

export async function fetchPublicProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const row = data as any;
      return {
        id: row.id,
        username: row.handle || row.username || 'explorer',
        full_name: row.display_name || row.full_name || 'Explorer',
        avatar_url: row.avatar_url || row.avatar || '',
        bio: row.bio || '',
        district: row.district || 'Heritage Node',
        vq_balance: row.vq_balance || 0,
        reputation: row.reputation || 0,
        role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
        tier: row.tier || 'EXPLORER',
        trust_score: row.trust_score || 90,
        created_at: row.created_at || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Error fetching public profile:', err);
  }
  return null;
}

export async function fetchPublicProfileByHandle(handle: string): Promise<UserProfile | null> {
  const cleanHandle = handle.replace(/^@/, '');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.eq.${cleanHandle},username.eq.${cleanHandle}`)
      .single();

    if (!error && data) {
      const row = data as any;
      return {
        id: row.id,
        username: row.handle || row.username || cleanHandle,
        full_name: row.display_name || row.full_name || cleanHandle,
        avatar_url: row.avatar_url || row.avatar || '',
        bio: row.bio || '',
        district: row.district || 'Heritage Node',
        vq_balance: row.vq_balance || 0,
        reputation: row.reputation || 0,
        role: (cleanHandle === 'funmarketmn') ? 'admin' : (row.role || 'explorer'),
        tier: row.tier || 'EXPLORER',
        trust_score: row.trust_score || 90,
        created_at: row.created_at || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Error fetching public profile by handle:', err);
  }
  return null;
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


