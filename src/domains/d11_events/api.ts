import { supabase } from '../../lib/supabase';
import { FlashEvent } from './types';

export const CANONICAL_FLASH_EVENT: FlashEvent = {
  id: 'flash_secret_gallery',
  title: 'Secret Pop-up Gallery',
  description: 'An exclusive, invitation-only underground art installation with neon projections, synth soundscapes, and interactive holographic panels.',
  ends_at: new Date(Date.now() + 106 * 60 * 1000).toISOString(),
  seconds_left: 6360,
  kind: 'secret_party',
  place_id: null
};

export async function fetchActiveFlashEvent(): Promise<FlashEvent> {
  try {
    const { data, error } = await supabase.rpc('get_active_flash_event');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const ev = data[0];
      if (ev && ev.seconds_left > 0) {
        return {
          id: ev.id,
          title: ev.title,
          description: ev.description || CANONICAL_FLASH_EVENT.description,
          place_id: ev.place_id || null,
          secret_id: ev.secret_id || null,
          ends_at: ev.ends_at,
          seconds_left: ev.seconds_left,
          kind: ev.kind || 'secret_party'
        };
      }
    }

    // Fallback table query if RPC is not yet created in Supabase
    const { data: tableData, error: tableErr } = await supabase
      .from('flash_events')
      .select('*')
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!tableErr && tableData) {
      const endsAt = new Date(tableData.ends_at).getTime();
      const now = Date.now();
      const secs = Math.max(0, Math.floor((endsAt - now) / 1000));
      if (secs > 0) {
        return {
          id: tableData.id,
          title: tableData.title,
          description: tableData.description || '',
          place_id: tableData.place_id || null,
          secret_id: tableData.secret_id || null,
          ends_at: tableData.ends_at,
          seconds_left: secs,
          kind: tableData.kind || 'secret_party'
        };
      }
    }

    return CANONICAL_FLASH_EVENT;
  } catch (err) {
    console.warn('Error fetching active flash event, using canonical active event:', err);
    return CANONICAL_FLASH_EVENT;
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
  try {
    const { error } = await supabase.from('flash_events').insert([{
      title: params.title,
      description: params.description,
      place_id: params.place_id || null,
      starts_at: params.starts_at,
      ends_at: params.ends_at,
      status: 'active',
      kind: params.kind || 'secret_party',
      created_by: params.created_by || null
    }]);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create flash event' };
  }
}
