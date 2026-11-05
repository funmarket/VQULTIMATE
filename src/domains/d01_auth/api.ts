import { supabase } from '../../lib/supabase';
import { UserProfile } from './types';
import { REAL_SUPABASE_TEST_PROFILES } from '../d02_users';

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const stored = localStorage.getItem('vq_active_user');
      if (stored) return JSON.parse(stored);
      return REAL_SUPABASE_TEST_PROFILES[0]; // funmarketmn admin test profile
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      return REAL_SUPABASE_TEST_PROFILES[0];
    }
    const profile = data as UserProfile;
    // Sole admin rule enforcement
    if (session.user.email !== 'funmarketmn@hotmail.com' && profile.username !== 'funmarketmn') {
      profile.role = 'explorer';
    }
    return profile;
  } catch (err) {
    console.warn('Supabase auth fetch fallback to test profile:', err);
    const stored = localStorage.getItem('vq_active_user');
    if (stored) return JSON.parse(stored);
    return REAL_SUPABASE_TEST_PROFILES[0];
  }
}

export async function signInAsTestUser(user: UserProfile): Promise<UserProfile> {
  // Enforce sole admin rule: only funmarketmn is admin
  if (user.username !== 'funmarketmn' && user.id !== 'usr_funmarketmn') {
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
      avatar_url: data.user.user_metadata?.avatar_url || REAL_SUPABASE_TEST_PROFILES[0].avatar_url,
      vq_balance: isAdmin ? 5000 : 1000,
      reputation: isAdmin ? 100 : 90,
      role: isAdmin ? 'admin' : 'explorer',
      created_at: new Date().toISOString()
    };
    localStorage.setItem('vq_active_user', JSON.stringify(profile));
    return profile;
  }
  return REAL_SUPABASE_TEST_PROFILES[0];
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

