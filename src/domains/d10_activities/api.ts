import { supabase } from '../../lib/supabase';
import { FlashEvent, ActivityFeedItem } from './types';

export const CANONICAL_FLASH_EVENT: FlashEvent = {
  id: 'flash_neon_drift',
  title: '⚡ FLASH EVENT: Midnight Neon Drift',
  description: 'Exclusive after-hours rooftop lantern meet. Hunt down the waypoint before countdown hits zero to claim +500 VQ.',
  ends_at: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
  seconds_left: 840,
  kind: 'after_hours',
  location: 'Cultural Sanctuary Node',
  vq_reward: 500,
  active: true
};

export const CANONICAL_ACTIVITIES: ActivityFeedItem[] = [
  { id: 'act-1', user_name: 'Tariq Al-Mansoori', action: 'checked in at', target: 'Al Fahidi Spice Souk', time_ago: '2m ago', vq_earned: 150 },
  { id: 'act-2', user_name: 'Layla Chen', action: 'completed trail', target: 'Neon Marina Cyber Art Walk', time_ago: '8m ago', vq_earned: 350 },
  { id: 'act-3', user_name: 'Zainab Nuru', action: 'established confirmed Vibe with', target: '@tariq_guardian', time_ago: '15m ago', vq_earned: 200 }
];

export async function fetchFlashEvent(): Promise<FlashEvent | null> {
  try {
    const { data, error } = await supabase.rpc('get_active_flash_event');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const ev = data[0];
      return {
        id: ev.id,
        title: `⚡ FLASH EVENT: ${ev.title}`,
        description: ev.description || 'Exclusive district flash event. Hunt now before countdown hits zero.',
        ends_at: ev.ends_at,
        seconds_left: ev.seconds_left ?? 600,
        kind: ev.kind || 'limited_promo',
        place_id: ev.place_id,
        secret_id: ev.secret_id,
        vq_reward: 500,
        active: (ev.seconds_left ?? 600) > 0
      };
    }

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
          title: `⚡ FLASH EVENT: ${tableData.title}`,
          description: tableData.description,
          ends_at: tableData.ends_at,
          seconds_left: secs,
          kind: tableData.kind || 'limited_promo',
          place_id: tableData.place_id,
          secret_id: tableData.secret_id,
          vq_reward: 500,
          active: true
        };
      }
    }

    return CANONICAL_FLASH_EVENT;
  } catch (err) {
    console.warn('Error querying flash event via RPC, using canonical event:', err);
    return CANONICAL_FLASH_EVENT;
  }
}

export async function fetchActivities(): Promise<ActivityFeedItem[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data && data.length > 0) {
      return data as ActivityFeedItem[];
    }
    return CANONICAL_ACTIVITIES;
  } catch (err) {
    console.warn('Error querying activities, using active stream:', err);
    return CANONICAL_ACTIVITIES;
  }
}
