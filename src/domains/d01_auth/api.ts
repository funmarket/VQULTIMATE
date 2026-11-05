import { supabase } from '../../lib/supabase';
import { UserProfile } from './types';

// Real test users mapped to Supabase project test accounts
export const REAL_TEST_USERS: UserProfile[] = [
  {
    id: 'usr_guardian_01',
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
    id: 'usr_explorer_02',
    username: 'layla_vibes',
    full_name: 'Layla Chen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    bio: 'Urban food anthropologist & hidden alley hunter.',
    vq_balance: 890,
    reputation: 92,
    role: 'explorer',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_admin_03',
    username: 'vq_admin',
    full_name: 'System Sentinel',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    bio: 'Core network orchestrator and pulse curator.',
    vq_balance: 5000,
    reputation: 100,
    role: 'admin',
    created_at: new Date().toISOString()
  }
];

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Check localStorage for active test user session
      const stored = localStorage.getItem('vq_active_user');
      if (stored) return JSON.parse(stored);
      return REAL_TEST_USERS[0]; // Default test user for seamless demo
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      return REAL_TEST_USERS[0];
    }
    return data as UserProfile;
  } catch (err) {
    console.warn('Supabase auth fetch fallback to test user:', err);
    const stored = localStorage.getItem('vq_active_user');
    if (stored) return JSON.parse(stored);
    return REAL_TEST_USERS[0];
  }
}

export async function signInAsTestUser(user: UserProfile): Promise<UserProfile> {
  localStorage.setItem('vq_active_user', JSON.stringify(user));
  return user;
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem('vq_active_user');
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
}
