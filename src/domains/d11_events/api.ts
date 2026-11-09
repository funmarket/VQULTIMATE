import { supabase } from '../../lib/supabase';
import { FlashEvent, SuggestionCategory } from './types';

interface FlashEventRow {
  id: string;
  title: string;
  description: string | null;
  place_id: string | null;
  secret_id: string | null;
  starts_at: string;
  ends_at: string;
  kind: FlashEvent['kind'];
}

function toFlashEvent(row: FlashEventRow): FlashEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    place_id: row.place_id,
    secret_id: row.secret_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    kind: row.kind,
    seconds_left: Math.max(0, Math.ceil((Date.parse(row.ends_at) - Date.now()) / 1000))
  };
}

// D11 Flash Events, not D18's independent 60-second VibeFlash experience.
export async function fetchFlashEvents(): Promise<FlashEvent[]> {
  const { data, error } = await supabase
    .from('flash_events')
    .select('id,title,description,place_id,secret_id,starts_at,ends_at,kind')
    .gt('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50);
  if (error) {
    console.error('D11 Flash Events could not be loaded:', error.message);
    return [];
  }
  return ((data || []) as FlashEventRow[]).map(toFlashEvent);
}

export async function fetchActiveFlashEvent(): Promise<FlashEvent | null> {
  const now = Date.now();
  const events = await fetchFlashEvents();
  return events.find((event) => Date.parse(event.starts_at || '') <= now && Date.parse(event.ends_at) > now) || null;
}

export async function fetchFlashEventRsvp(eventId: string): Promise<{ joined: boolean; error?: string }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { joined: false };
  const { data, error } = await supabase
    .from('flash_event_rsvps')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  return error ? { joined: false, error: error.message } : { joined: Boolean(data) };
}

export async function setFlashEventRsvp(eventId: string, join: boolean): Promise<{ success: boolean; joined?: boolean; error?: string }> {
  if (!eventId) return { success: false, error: 'Select a Flash Event first.' };
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { success: false, error: 'Sign in to RSVP.' };
  const { data, error } = await supabase.rpc(join ? 'join_flash_event' : 'cancel_flash_event_rsvp', { p_event_id: eventId });
  if (error) return { success: false, error: error.message };
  if (!data || data.success !== true) return { success: false, error: data?.error || 'The RSVP was not saved.' };
  return { success: true, joined: join };
}

// No authorized D11 creator INSERT policy has been verified in the live database.
export async function createFlashEvent(_params: {
  title: string;
  description: string;
  place_id?: string | null;
  starts_at: string;
  ends_at: string;
  kind?: string;
  created_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Flash Event creation is unavailable until the authorized creator backend is configured.' };
}

export async function submitVibeSuggestion(_params: {
  title: string;
  description: string;
  category: SuggestionCategory;
}): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Vibe suggestion submissions require a provisioned review backend.' };
}
