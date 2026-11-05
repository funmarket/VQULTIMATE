import { supabase } from '../../lib/supabase';
import { UserProfile } from './types';

// Real test users mapped to Supabase project test accounts
export const REAL_TEST_USERS: UserProfile[] = [
  {
    id: 'usr_guardian_01',
    username: 'funmarketmn',
    full_name: 'Funmarket Admin',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Sole Platform Administrator & Network Architect.',
    vq_balance: 5000,
    reputation: 100,
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_guardian_02',
    username: 'tariq_guardian',
    full_name: 'Tariq Al-Mansoori',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Lead District Guardian for Heritage & Night Trails.',
    vq_balance: 1420,
    reputation: 98,
    role: 'guardian',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_explorer_03',
    username: 'layla_vibes',
    full_name: 'Layla Chen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    bio: 'Urban food anthropologist & hidden alley hunter.',
    vq_balance: 890,
    reputation: 92,
    role: 'explorer',
    created_at: new Date().toISOString()
  }
];

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const stored = localStorage.getItem('vq_active_user');
      if (stored) return JSON.parse(stored);
      return REAL_TEST_USERS[0]; // default to funmarketmn admin test user
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      return REAL_TEST_USERS[0];
    }
    const profile = data as UserProfile;
    // Sole admin rule enforcement
    if (session.user.email !== 'funmarketmn@hotmail.com' && profile.username !== 'funmarketmn') {
      profile.role = 'explorer';
    }
    return profile;
  } catch (err) {
    console.warn('Supabase auth fetch fallback to test user:', err);
    const stored = localStorage.getItem('vq_active_user');
    if (stored) return JSON.parse(stored);
    return REAL_TEST_USERS[0];
  }
}

export async function signInAsTestUser(user: UserProfile): Promise<UserProfile> {
  // Enforce sole admin rule: only funmarketmn is admin
  if (user.username !== 'funmarketmn' && user.id !== 'usr_guardian_01') {
    user.role = 'explorer';
  }
  localStorage.setItem('vq_active_user', JSON.stringify(user));
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    const isAdmin = data.user.email === 'funmarketmn@hotmail.com';
    const profile: UserProfile = {
      id: data.user.id,
      username: data.user.email?.split('@')[0] || 'explorer',
      full_name: data.user.user_metadata?.full_name || (isAdmin ? 'Funmarket Admin' : 'Authenticated Voyager'),
      avatar_url: data.user.user_metadata?.avatar_url || REAL_TEST_USERS[0].avatar_url,
      vq_balance: isAdmin ? 5000 : 1000,
      reputation: isAdmin ? 100 : 90,
      role: isAdmin ? 'admin' : 'explorer',
      created_at: new Date().toISOString()
    };
    localStorage.setItem('vq_active_user', JSON.stringify(profile));
    return profile;
  }
  return REAL_TEST_USERS[0];
}

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem('vq_active_user');
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
}
