import { supabase } from '../../lib/supabase';
import { UserProfile } from './types';

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      const isAdmin = session.user.email === 'funmarketmn@hotmail.com';
      const fallbackProfile: UserProfile = {
        id: session.user.id,
        username: session.user.email?.split('@')[0] || 'explorer',
        full_name: session.user.user_metadata?.full_name || (isAdmin ? 'Funmarket Admin' : 'Explorer Voyager'),
        avatar_url: session.user.user_metadata?.avatar_url || '',
        vq_balance: isAdmin ? 5000 : 1000,
        reputation: isAdmin ? 100 : 90,
        role: isAdmin ? 'admin' : 'explorer',
        created_at: new Date().toISOString()
      };
      return fallbackProfile;
    }

    const profile = data as UserProfile;
    // Sole admin rule enforcement: only funmarketmn is admin
    if (session.user.email !== 'funmarketmn@hotmail.com' && profile.username !== 'funmarketmn') {
      profile.role = 'explorer';
    }
    return profile;
  } catch (err) {
    console.warn('Supabase auth getSession error:', err);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    const isAdmin = data.user.email === 'funmarketmn@hotmail.com';
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileRow) {
      const prof = profileRow as UserProfile;
      if (!isAdmin && prof.username !== 'funmarketmn') {
        prof.role = 'explorer';
      }
      return prof;
    }

    const profile: UserProfile = {
      id: data.user.id,
      username: data.user.email?.split('@')[0] || 'explorer',
      full_name: data.user.user_metadata?.full_name || (isAdmin ? 'Funmarket Admin' : 'Authenticated Voyager'),
      avatar_url: data.user.user_metadata?.avatar_url || '',
      vq_balance: isAdmin ? 5000 : 1000,
      reputation: isAdmin ? 100 : 90,
      role: isAdmin ? 'admin' : 'explorer',
      created_at: new Date().toISOString()
    };
    return profile;
  }
  throw new Error('User authentication failed');
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
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
}
