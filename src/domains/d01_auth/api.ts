import { supabase } from '../../lib/supabase';
import { UserProfile } from './types';

type ProfileRow = Record<string, unknown>;

async function linkedProfile(authId: string): Promise<UserProfile | null> {
  let row: ProfileRow | null = null;
  for (const id of ['usr_' + authId, authId]) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) { row = data; break; }
  }
  if (!row) {
    const { data: link, error } = await supabase.from('s00_test_identity_links')
      .select('legacy_profile_id').eq('auth_user_id', authId).maybeSingle();
    if (error) throw new Error(error.message);
    if (link) {
      const found = await supabase.from('profiles').select('*').eq('id', link.legacy_profile_id).maybeSingle();
      if (found.error) throw new Error(found.error.message);
      row = found.data;
    }
  }
  if (!row) return null;
  const { data: admin, error: adminError } = await supabase.from('vq_admin_assignments')
    .select('role').eq('auth_user_id', authId).eq('active', true).maybeSingle();
  if (adminError) throw new Error(adminError.message);
  return {
    id: String(row.id),
    username: String(row.handle || ''),
    full_name: String(row.display_name || row.handle || ''),
    avatar_url: String(row.photo_url || ''),
    bio: String(row.bio || ''),
    district: String(row.city || ''),
    vq_balance: Number(row.points || 0),
    reputation: 0,
    role: admin?.role === 'platform_admin' ? 'admin' : row.account_type === 'pro' ? 'guardian' : 'explorer',
    created_at: String(row.created_at || ''),
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return linkedProfile(data.user.id);
}

/** Use VQgemini's real email or @username Supabase authentication paths. */
export async function signInWithEmail(identifier: string, password: string): Promise<UserProfile> {
  const value = identifier.trim();
  if (!value || !password) throw new Error('Email or @username and password are required.');
  if (value.includes('@') && !value.startsWith('@')) {
    const { error } = await supabase.auth.signInWithPassword({ email: value, password });
    if (error) throw new Error(error.message);
  } else {
    const username = value.replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(username)) throw new Error('Invalid username.');
    const { data, error } = await supabase.functions.invoke('sign-in-by-username', { body: { username, password } });
    if (error || !data?.access_token || !data?.refresh_token) {
      throw new Error('Invalid username or password, or username sign-in is unavailable.');
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token, refresh_token: data.refresh_token,
    });
    if (sessionError) throw new Error(sessionError.message);
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Authenticated session could not be verified.');
  const profile = await linkedProfile(data.user.id);
  if (!profile) throw new Error('Signed in, but no linked profile was found. Contact the administrator.');
  return profile;
}

/**
 * Keep the UI synchronized with real Supabase login/logout and token sessions.
 * The callback receives null for signed-out users, never a manufactured guest.
 */
export function subscribeAuthProfile(onChange: (profile: UserProfile | null) => void): () => void {
  let active = true;
  let generation = 0;
  async function refresh() {
    const currentGeneration = ++generation;
    try {
      const profile = await getCurrentUserProfile();
      if (active && currentGeneration === generation) onChange(profile);
    } catch (error) {
      console.warn('Authenticated profile refresh failed:', error);
      if (active && currentGeneration === generation) onChange(null);
    }
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      generation++;
      if (active) onChange(null);
    } else {
      // Run outside the auth state callback to avoid nested auth-client deadlocks.
      Promise.resolve().then(() => { if (active) void refresh(); });
    }
  });
  void refresh();
  return () => {
    active = false;
    generation++;
    subscription.unsubscribe();
  };
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
