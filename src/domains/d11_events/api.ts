import { supabase } from '../../lib/supabase';
import { FlashEvent } from './types';
import { getVerifiedEventEntitlement } from '../d21_entitlements/api';

const eventsEnabled = import.meta.env.VITE_D11_FLASH_EVENTS_ENABLED === 'true';

type FlashEventRow = {
  id: string;
  title: string;
  description: string;
  place_id: string | null;
  secret_id: string | null;
  ends_at: string;
  kind: FlashEvent['kind'];
};

/**
 * D11 Flash Events are independent of D18's 60-second vibe_flash_windows.
 * The feature stays disabled until the reviewed D11 migration is applied
 * and VITE_D11_FLASH_EVENTS_ENABLED is enabled for the target environment.
 */
export async function fetchActiveFlashEvent(): Promise<FlashEvent | null> {
  if (!eventsEnabled) return null;

  const { data, error } = await supabase.from('flash_events')
    .select('id,title,description,place_id,secret_id,ends_at,kind')
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Flash Events could not be loaded: ${error.message}`);
  if (!data) return null;
  const ev = data as FlashEventRow;
  const secondsLeft = Math.max(0, Math.floor((Date.parse(ev.ends_at) - Date.now()) / 1000));
  if (secondsLeft <= 0) return null;

  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    place_id: ev.place_id,
    secret_id: ev.secret_id,
    ends_at: ev.ends_at,
    seconds_left: secondsLeft,
    kind: ev.kind
  };
}

export async function canCreateFlashEvent(): Promise<boolean> {
  if (!eventsEnabled) return false;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return false;

  const { data, error } = await supabase.from('vq_admin_assignments')
    .select('auth_user_id')
    .eq('auth_user_id', auth.user.id)
    .eq('role', 'platform_admin')
    .eq('active', true)
    .maybeSingle();

  if (error) return false;
  if (data) return true;
  try {
    return Boolean(await getVerifiedEventEntitlement());
  } catch {
    return false;
  }
}

export async function createFlashEvent(params: {
  title: string;
  description: string;
  place_id?: string | null;
  starts_at: string;
  ends_at: string;
  kind?: string;
  created_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!eventsEnabled) {
    return { success: false, error: 'Flash Events are unavailable until the authorized D11 backend is installed.' };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { success: false, error: 'Sign in to create Flash Events.' };
  if (!(await canCreateFlashEvent())) {
    return { success: false, error: 'Only server-verified Pro, Business or App Admin accounts can create Flash Events.' };
  }

  const title = params.title.trim();
  const description = params.description.trim();
  const start = Date.parse(params.starts_at);
  const end = Date.parse(params.ends_at);
  if (!title || title.length > 160 || !description || description.length > 3000 ||
      !Number.isFinite(start) || !Number.isFinite(end) ||
      end <= start || end - start > 6 * 60 * 60 * 1000) {
    return { success: false, error: 'Invalid Flash Event details or duration.' };
  }

  const { error } = await supabase.from('flash_events').insert({
    title,
    description,
    place_id: params.place_id || null,
    starts_at: params.starts_at,
    ends_at: params.ends_at,
    kind: params.kind || 'secret_party'
  });
  return error
    ? { success: false, error: `Unable to create Flash Event: ${error.message}` }
    : { success: true };
}
