import { supabase } from '../../lib/supabase';
import { Guardian, UserProfile } from './types';

// Canonical test user profiles matching the Supabase project avdfessrhbsqwlfmbdau
// Sole admin: funmarketmn@hotmail.com (handle: funmarketmn)
export const REAL_SUPABASE_TEST_PROFILES: UserProfile[] = [
  {
    id: 'usr_funmarketmn',
    username: 'funmarketmn',
    full_name: 'Funmarket Admin',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Sole Platform Administrator & Network Architect.',
    district: 'Central Command',
    vq_balance: 5000,
    reputation: 100,
    role: 'admin',
    tier: 'ADMIN SENTINEL',
    trust_score: 100,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_tariq_guardian',
    username: 'tariq_guardian',
    full_name: 'Tariq Al-Mansoori',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Lead District Guardian for Heritage & Night Trails. Master cartographer of ancient trade routes.',
    district: 'Dubai Creek & Heritage District',
    vq_balance: 1420,
    reputation: 98,
    role: 'guardian',
    tier: 'SUPREME GUARDIAN',
    trust_score: 99,
    created_at: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 'usr_layla_vibes',
    username: 'layla_vibes',
    full_name: 'Layla Chen',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Urban food anthropologist, augmented reality synth curator & night market scout.',
    district: 'Marina & Neon Waterfront',
    vq_balance: 890,
    reputation: 92,
    role: 'explorer',
    tier: 'PRO GUARDIAN',
    trust_score: 96,
    created_at: '2026-01-03T00:00:00.000Z'
  },
  {
    id: 'usr_zainab_nuru',
    username: 'zainab_nuru',
    full_name: 'Zainab Nuru',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    bio: 'Sculptor, coffee connoisseur, subterranean gallery founder and midnight dunes explorer.',
    district: 'Al Quoz Industrial Arts Quarter',
    vq_balance: 1150,
    reputation: 94,
    role: 'explorer',
    tier: 'CULTURAL GUIDE',
    trust_score: 94,
    created_at: '2026-01-04T00:00:00.000Z'
  },
  {
    id: 'usr_sarah_carthage',
    username: 'sarah_carthage',
    full_name: 'Sarah K.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    bio: 'Carthage ruins photographer, sea cliff cyclist & cultural architecture documentarian.',
    district: 'Carthage & Coastal Bluff',
    vq_balance: 970,
    reputation: 91,
    role: 'explorer',
    tier: 'LOCAL LEGEND',
    trust_score: 92,
    created_at: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'usr_yassine_medina',
    username: 'yassine_medina',
    full_name: 'Yassine B.',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Tunis Medina architect, historic coffee connoisseur & acoustic heritage archivist.',
    district: 'Tunis Medina Citadel',
    vq_balance: 1340,
    reputation: 95,
    role: 'guardian',
    tier: 'PRO GUARDIAN',
    trust_score: 95,
    created_at: '2026-01-06T00:00:00.000Z'
  },
  {
    id: 'usr_hannibal',
    username: 'hannibal',
    full_name: 'Hannibal Barca',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    bio: 'Ancient trail strategist, high acoustic resonance explorer & desert crossing guide.',
    district: 'Byrsa Heights Heritage Node',
    vq_balance: 1600,
    reputation: 98,
    role: 'explorer',
    tier: 'MASTER SENTINEL',
    trust_score: 98,
    created_at: '2026-01-07T00:00:00.000Z'
  }
];

export async function fetchDemoProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return REAL_SUPABASE_TEST_PROFILES;
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      username: row.handle || row.username || 'explorer',
      full_name: row.display_name || row.full_name || 'Explorer',
      avatar_url: row.avatar_url || row.avatar || REAL_SUPABASE_TEST_PROFILES[0].avatar_url,
      bio: row.bio || 'Active VibeQuest district explorer.',
      district: row.district || 'Heritage Node',
      vq_balance: row.vq_balance || 1000,
      reputation: row.reputation || 90,
      role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
      tier: row.tier || 'EXPLORER',
      trust_score: row.trust_score || 90,
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    return REAL_SUPABASE_TEST_PROFILES;
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
        avatar_url: row.avatar_url || row.avatar || REAL_SUPABASE_TEST_PROFILES[0].avatar_url,
        bio: row.bio || 'Active VibeQuest district explorer.',
        district: row.district || 'Heritage Node',
        vq_balance: row.vq_balance || 1000,
        reputation: row.reputation || 90,
        role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
        tier: row.tier || 'EXPLORER',
        trust_score: row.trust_score || 90,
        created_at: row.created_at || new Date().toISOString()
      };
    }
  } catch {
    // continue to fallback
  }

  const found = REAL_SUPABASE_TEST_PROFILES.find((p) => p.id === userId);
  return found || null;
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
        avatar_url: row.avatar_url || row.avatar || REAL_SUPABASE_TEST_PROFILES[0].avatar_url,
        bio: row.bio || 'Active VibeQuest district explorer.',
        district: row.district || 'Heritage Node',
        vq_balance: row.vq_balance || 1000,
        reputation: row.reputation || 90,
        role: (cleanHandle === 'funmarketmn') ? 'admin' : (row.role || 'explorer'),
        tier: row.tier || 'EXPLORER',
        trust_score: row.trust_score || 90,
        created_at: row.created_at || new Date().toISOString()
      };
    }
  } catch {
    // continue to fallback
  }

  const found = REAL_SUPABASE_TEST_PROFILES.find((p) => p.username === cleanHandle);
  return found || null;
}

export async function fetchGuardians(): Promise<Guardian[]> {
  try {
    const { data, error } = await supabase.from('guardians').select('*');
    if (error || !data || data.length === 0) {
      return REAL_SUPABASE_TEST_PROFILES.filter((p) => p.role === 'guardian' || p.tier?.includes('GUARDIAN')).map((p) => ({
        id: p.id,
        name: p.full_name,
        district: p.district || 'Heritage Quarter',
        avatar: p.avatar_url,
        badge: p.tier || 'Master Sentinel',
        status: 'active',
        trustScore: p.trust_score || 95,
        lat: 25.2048,
        lng: 55.2708,
        bio: p.bio
      }));
    }
    return data as Guardian[];
  } catch {
    return REAL_SUPABASE_TEST_PROFILES.filter((p) => p.role === 'guardian' || p.tier?.includes('GUARDIAN')).map((p) => ({
      id: p.id,
      name: p.full_name,
      district: p.district || 'Heritage Quarter',
      avatar: p.avatar_url,
      badge: p.tier || 'Master Sentinel',
      status: 'active',
      trustScore: p.trust_score || 95,
      lat: 25.2048,
      lng: 55.2708,
      bio: p.bio
    }));
  }
}

