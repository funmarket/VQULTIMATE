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
        lat: 25.2048,
        lng: 55.2708,
        bio: p.bio
      }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching guardians:', err);
    return [];
  }
}


