import { supabase } from '../../lib/supabase';
import { UserProfile, ProfileRegistration, RegistrationResult, ProfileEdits } from './types';
import { queuePendingProfileAvatar, uploadPendingProfileAvatar, uploadProfileAvatar } from '../../lib/profileAvatar';

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
  const { data: prefs, error: preferencesError } = await supabase.from('profile_preferences')
    .select('telegram_handle,x_handle,preferred_contact_method,cozy_diary_mode')
    .eq('profile_id', String(row.id)).maybeSingle();
  if (preferencesError) throw new Error(preferencesError.message);
  let photo = String(row.photo_url || '');
  try {
    const pending = await uploadPendingProfileAvatar(authId, String(row.id));
    if (pending) photo = pending;
  } catch (error) {
    console.warn('Pending avatar upload failed:', error);
  }
  return {
    id: String(row.id),
    username: String(row.handle || ''),
    full_name: String(row.display_name || row.handle || ''),
    avatar_url: photo,
    bio: String(row.bio || ''),
    district: String(row.city || ''),
    city: String(row.city || ''),
    interests: Array.isArray(row.interests) ? row.interests : [],
    languages: Array.isArray(row.languages) ? row.languages : [],
    xHandle: String(prefs?.x_handle || ''),
    telegramHandle: String(prefs?.telegram_handle || ''),
    contactMethod: String(prefs?.preferred_contact_method || 'none'),
    cozyDiaryMode: Boolean(prefs?.cozy_diary_mode),
    accountType: String(row.account_type || 'vibe'),
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
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Your account exists but its profile is not linked or recognized. Contact the administrator.');
  }
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


/** Same profile-provisioning contract and verification handoff as VQgemini. */
export async function registerProfile(data: ProfileRegistration): Promise<RegistrationResult> {
  const handle = data.handle.trim().toLowerCase().replace(/^@/, '');
  const displayName = data.displayName.trim();
  const email = data.email.trim();
  if (!/^[a-z0-9_]{3,32}$/.test(handle)) throw new Error('Choose a username of 3–32 letters, numbers or underscores.');
  if (!displayName || displayName.length > 80) throw new Error('Display name must be 1–80 characters.');
  if (!email || !data.password || data.password.length < 8) throw new Error('Email and password of at least 8 characters are required.');
  if (data.cozyDiaryMode && (!data.bio?.trim() || !data.city?.trim() ||
    !(data.telegramHandle?.trim() || data.xHandle?.trim()))) {
    throw new Error('Cozy Diary Mode requires a bio, broad city and at least one contact handle.');
  }
  const { data: existing, error: lookupError } = await supabase.from('profiles')
    .select('id').ilike('handle', handle).maybeSingle();
  if (lookupError) throw new Error('Could not verify username availability.');
  if (existing) throw new Error('Username is already taken.');
  const { data: signup, error: signupError } = await supabase.auth.signUp({
    email, password: data.password,
    options: {
      emailRedirectTo: window.location.origin + '/',
      data: {
        handle, display_name: displayName, photo_url: data.photoUrl || '',
        bio: data.bio || '', city: data.city || '', interests: data.interests || [],
        languages: data.languages || [],
        telegram_handle: data.telegramHandle || '', x_handle: data.xHandle || '',
        preferred_contact_method: data.contactMethod || 'none',
        cozy_diary_mode: Boolean(data.cozyDiaryMode),
      },
    },
  });
  if (signupError) throw new Error(signupError.message);
  if (!signup.user) throw new Error('Account creation failed.');
  if (!signup.session) {
    let avatarUploadNote: string | undefined;
    if (data.avatarFile) {
      try { await queuePendingProfileAvatar(signup.user.id, data.avatarFile); }
      catch {
        avatarUploadNote = 'Account created, but the selected photo could not be retained. Upload after verifying your email.';
      }
    }
    return { pendingVerification: true, email, avatarUploadNote };
  }
  const profile = await linkedProfile(signup.user.id);
  if (!profile) throw new Error('Account created, but profile provisioning is pending.');
  let avatarUploadNote: string | undefined;
  if (data.avatarFile) {
    try {
      profile.avatar_url = await uploadProfileAvatar(data.avatarFile, profile.id);
    } catch (error) {
      avatarUploadNote = 'Your account is ready, but photo upload failed. Try Edit Profile.';
      console.warn('Avatar upload failed:', error);
    }
  }
  return { pendingVerification: false, profile, avatarUploadNote };
}

/** Persist edits to canonical profile and private preferences, never local state only. */
export async function updateExistingProfile(profile: UserProfile, edits: ProfileEdits): Promise<UserProfile> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to edit your profile.');
  const current = await linkedProfile(auth.user.id);
  if (!current || current.id !== profile.id) throw new Error('This profile is not linked to your account.');
  const fields: Record<string, unknown> = {};
  if (edits.displayName !== undefined) {
    const name = edits.displayName.trim();
    if (!name || name.length > 80) throw new Error('Display name must be 1–80 characters.');
    fields.display_name = name;
  }
  if (edits.bio !== undefined) {
    if (edits.bio.length > 280) throw new Error('Bio must not exceed 280 characters.');
    fields.bio = edits.bio.trim();
  }
  if (edits.city !== undefined) {
    if (edits.city.length > 100) throw new Error('City must not exceed 100 characters.');
    fields.city = edits.city.trim();
  }
  if (edits.interests !== undefined) {
    if (edits.interests.length > 30 || edits.interests.some(t => !t.trim() || t.length > 60)) {
      throw new Error('Choose up to 30 valid interests.');
    }
    fields.interests = [...new Set(edits.interests.map(t => t.toLowerCase().trim()))];
  }
  if (edits.languages !== undefined) fields.languages = edits.languages;
  const telegram = edits.telegramHandle ?? current.telegramHandle ?? '';
  const xHandle = edits.xHandle ?? current.xHandle ?? '';
  const contact = edits.contactMethod ?? current.contactMethod ?? 'none';
  const cozy = edits.cozyDiaryMode ?? current.cozyDiaryMode ?? false;
  if (telegram.length > 64 || xHandle.length > 64) throw new Error('Contact handle is too long.');
  if (!['none','telegram','x','email'].includes(contact)) throw new Error('Invalid contact preference.');
  if (cozy && (!(String(fields.bio ?? current.bio ?? '')).trim() ||
    !(String(fields.city ?? current.city ?? '')).trim() || !(telegram.trim() || xHandle.trim()))) {
    throw new Error('Cozy Diary Mode requires bio, city and a contact handle.');
  }
  if (typeof edits.photoUrl === 'string') fields.photo_url = edits.photoUrl.trim();
  if (edits.avatarFile) fields.photo_url = await uploadProfileAvatar(edits.avatarFile, current.id);
  if (Object.keys(fields).length > 0) {
    const { data, error } = await supabase.from('profiles').update(fields).eq('id', current.id).select('id').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Profile update did not persist.');
  }
  if (['telegramHandle','xHandle','contactMethod','cozyDiaryMode'].some(
    key => Object.prototype.hasOwnProperty.call(edits, key))) {
    const { data: existing, error: lookupError } = await supabase.from('profile_preferences')
      .select('profile_id').eq('profile_id', current.id).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const privateFields = {
      telegram_handle: telegram.trim(), x_handle: xHandle.trim(),
      preferred_contact_method: contact, cozy_diary_mode: cozy,
    };
    const response = existing
      ? await supabase.from('profile_preferences').update(privateFields).eq('profile_id', current.id)
      : await supabase.from('profile_preferences').insert({ profile_id: current.id, ...privateFields });
    if (response.error) throw new Error(response.error.message);
  }
  const updated = await linkedProfile(auth.user.id);
  if (!updated) throw new Error('Profile saved but could not be reloaded.');
  return updated;
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
