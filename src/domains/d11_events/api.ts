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
  starts_at: string;
  ends_at: string;
  kind: FlashEvent['kind'];
};

const DISCOVERY_WINDOW_MINUTES = 60;
const MAX_DISCOVERY_ITEMS = 20;

/**
 * D11 Flash Events are independent of D18's 60-second vibe_flash_windows.
 * Only published events that start within 60 minutes and end in the future
 * can appear on Home. Supabase RLS enforces this same window.
 */
export async function fetchDiscoverableFlashEvents(): Promise<FlashEvent[]> {
  if (!eventsEnabled) return [];
  const now = Date.now();
  const { data, error } = await supabase.from('flash_events')
    .select('id,title,description,place_id,secret_id,starts_at,ends_at,kind')
    .eq('status', 'active')
    .lte('starts_at', new Date(now + DISCOVERY_WINDOW_MINUTES * 60 * 1000).toISOString())
    .gt('ends_at', new Date(now).toISOString())
    .order('starts_at', { ascending: true })
    .limit(MAX_DISCOVERY_ITEMS);

  if (error) throw new Error(`Flash Events could not be loaded: ${error.message}`);
  return ((data || []) as FlashEventRow[])
    .filter(ev => {
      const start = Date.parse(ev.starts_at);
      const end = Date.parse(ev.ends_at);
      return Number.isFinite(start) && Number.isFinite(end) && end > now && start <= now + 60 * 60 * 1000;
    })
    .sort((a,b) => {
      const aLive = Date.parse(a.starts_at) <= now;
      const bLive = Date.parse(b.starts_at) <= now;
      if (aLive !== bLive) return aLive ? -1 : 1;
      return Date.parse(a.starts_at) - Date.parse(b.starts_at);
    })
    .map(ev => ({
      ...ev,
      seconds_left: Math.max(0, Math.ceil((Date.parse(ev.ends_at) - now) / 1000))
    }));
}

/** Backward-compatible single-feature query for callers not yet migrated to the gallery. */
export async function fetchActiveFlashEvent(): Promise<FlashEvent | null> {
  return (await fetchDiscoverableFlashEvents())[0] ?? null;
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
