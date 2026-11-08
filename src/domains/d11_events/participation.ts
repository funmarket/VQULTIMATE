import { supabase } from '../../lib/supabase';

const participationEnabled = import.meta.env.VITE_D11_PARTICIPATION_ENABLED === 'true';
const eventsEnabled = import.meta.env.VITE_D11_FLASH_EVENTS_ENABLED === 'true';

export type SuggestionCategory = 'place' | 'event' | 'vibe';

async function currentAuthUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getMyFlashRsvp(eventId: string): Promise<boolean> {
  if (!participationEnabled || !eventsEnabled) return false;
  const id = await currentAuthUserId();
  if (!id) return false;
  const { data, error } = await supabase.from('flash_event_rsvps')
    .select('id').eq('event_id', eventId).eq('auth_user_id', id).maybeSingle();
  if (error) throw new Error('Could not verify your RSVP.');
  return !!data;
}

export async function joinFlashEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  if (!participationEnabled || !eventsEnabled) {
    return { success: false, error: 'Flash Event RSVP is not available yet.' };
  }
  const id = await currentAuthUserId();
  if (!id) return { success: false, error: 'Sign in to RSVP.' };
  if (!eventId) return { success: false, error: 'Choose an active Flash Event.' };
  const { error } = await supabase.from('flash_event_rsvps').insert({ event_id: eventId });
  if (!error) return { success: true };
  if (error.code === '23505') return { success: false, error: 'You have already RSVPed to this event.' };
  return { success: false, error: 'Could not reserve your spot. The event may have ended.' };
}

export async function cancelFlashRsvp(eventId: string): Promise<{ success: boolean; error?: string }> {
  if (!participationEnabled || !eventsEnabled) {
    return { success: false, error: 'Flash Event RSVP is not available yet.' };
  }
  const id = await currentAuthUserId();
  if (!id) return { success: false, error: 'Sign in to manage your RSVP.' };
  if (!eventId) return { success: false, error: 'Choose a Flash Event.' };
  const { error } = await supabase.from('flash_event_rsvps')
    .delete().eq('event_id', eventId).eq('auth_user_id', id);
  return error ? { success: false, error: 'Could not cancel your RSVP.' } : { success: true };
}

export async function submitVibeSuggestion(params: {
  title: string;
  description: string;
  category: SuggestionCategory;
}): Promise<{ success: boolean; error?: string }> {
  if (!participationEnabled) return { success: false, error: 'Suggestion submissions are not available yet.' };
  const id = await currentAuthUserId();
  if (!id) return { success: false, error: 'Sign in to suggest a Vibe.' };
  const title = params.title.trim();
  const description = params.description.trim();
  if (title.length < 3 || title.length > 120 || description.length < 10 || description.length > 1000 ||
      !['place', 'event', 'vibe'].includes(params.category)) {
    return { success: false, error: 'Enter a valid title, description and category.' };
  }
  const { error } = await supabase.from('vibe_suggestion_submissions')
    .insert({ title, description, category: params.category });
  return error
    ? { success: false, error: 'Could not submit your suggestion.' }
    : { success: true };
}
