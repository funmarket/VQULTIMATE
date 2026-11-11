import { supabase } from '../../lib/supabase';
import { VibeFlashItem } from './types';

export async function fetchActiveVibeFlashes(): Promise<VibeFlashItem[]> {
  try {
    const { data, error } = await supabase.rpc('rpc_get_unified_vibe_flash_board');
    if (error || !data) {
      const { data: tableData } = await supabase
        .from('vibe_flash_events')
        .select('*')
        .order('starts_at', { ascending: true });
      if (!tableData) return [];
      return tableData.map((row: any) => formatFlashRow(row));
    }
    const flashes = data.vibe_flashes || [];
    const meetupsAsFlashes = (data.upcoming_meetups || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      vibe_type: 'Meetup',
      place_id: m.place_id,
      venue_name: m.place_title,
      address: m.place_address,
      lat: m.lat || 0,
      lng: m.lng || 0,
      creator_id: m.host_user_id,
      creator_name: m.host_name,
      creator_avatar: m.host_avatar,
      photo_url: m.photo_url,
      starts_at: m.starts_at,
      expires_at: m.expires_at,
      entry_type: 'Free',
      vq_hunt_pool: 0,
      vq_reward_per_hunter: 500,
      max_capacity: m.max_capacity,
      interested_ids: [],
      going_ids: m.attendee_ids || [],
      created_at: m.created_at
    }));

    return [...flashes.map((r: any) => formatFlashRow(r)), ...meetupsAsFlashes];
  } catch {
    return [];
  }
}

function formatFlashRow(row: any): VibeFlashItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    vibe_type: String(row.vibe_type || 'Secret'),
    place_id: row.place_id || undefined,
    venue_name: String(row.venue_name || ''),
    address: row.address || '',
    lat: Number(row.lat || 0),
    lng: Number(row.lng || 0),
    creator_id: String(row.creator_id || ''),
    creator_name: String(row.creator_name || 'Creator'),
    creator_avatar: row.creator_avatar || '',
    photo_url: row.photo_url || '',
    starts_at: row.starts_at || new Date().toISOString(),
    expires_at: row.expires_at || new Date(Date.now() + 3600000).toISOString(),
    entry_type: row.entry_type || 'Free',
    entry_price_tnd: row.entry_price_tnd,
    entry_rules: row.entry_rules,
    parking_transport_notes: row.parking_transport_notes,
    vq_hunt_pool: Number(row.vq_hunt_pool || 0),
    vq_reward_per_hunter: Number(row.vq_reward_per_hunter || 500),
    max_capacity: Number(row.max_capacity || 20),
    interested_ids: row.interested_ids || [],
    going_ids: row.going_ids || [],
    verified_arrived_ids: row.verified_arrived_ids || [],
    claimed_reward_ids: row.claimed_reward_ids || [],
    created_at: row.created_at || new Date().toISOString()
  };
}

export async function createVibeFlashEvent(payload: any): Promise<{ success: boolean; event?: VibeFlashItem; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('vibe_flash_events')
      .insert([{
        title: payload.title,
        description: payload.description,
        vibe_type: payload.vibeType || 'Secret',
        place_id: payload.placeId || null,
        venue_name: payload.venueName,
        address: payload.address || '',
        lat: payload.lat,
        lng: payload.lng,
        creator_id: payload.creatorId,
        creator_name: payload.creatorName,
        creator_avatar: payload.creatorAvatar || '',
        photo_url: payload.photoUrl || null,
        starts_at: payload.startsAt,
        expires_at: payload.expiresAt,
        entry_type: payload.entryType || 'Free',
        entry_price_tnd: payload.entryPriceTnd || null,
        entry_rules: payload.entryRules || null,
        parking_transport_notes: payload.parkingTransportNotes || null,
        vq_hunt_pool: payload.vqHuntPool || 0,
        vq_reward_per_hunter: payload.vqRewardPerHunter || 500,
        max_capacity: payload.maxCapacity || 20,
        going_ids: [payload.creatorId]
      }])
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create Vibe Flash event' };
    }
    return { success: true, event: formatFlashRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Vibe flash network error' };
  }
}

export async function toggleVibeFlashRsvp(flashId: string, userId: string, mode: 'interested' | 'going'): Promise<{ success: boolean; status?: string }> {
  try {
    const { data, error } = await supabase.rpc('rpc_toggle_vibe_flash_rsvp', {
      p_flash_id: flashId,
      p_user_id: userId,
      p_mode: mode
    });
    if (error || !data?.success) {
      return { success: false };
    }
    return { success: true, status: data.status };
  } catch {
    return { success: false };
  }
}
