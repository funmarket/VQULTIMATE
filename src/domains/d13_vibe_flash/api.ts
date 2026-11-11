import { supabase } from '../../lib/supabase';
import { VibeFlashEvent, CreateVibeFlashInput, VibeFlashCategory } from './types';
import { fetchAllMeetups, toggleMeetupRsvp } from '../d12_meetups';

function mapRowToVibeFlash(row: any): VibeFlashEvent {
  const photo = row.photo_url || row.photoUrl || undefined;
  const placeName = row.place_name || row.venue_name || 'Secret Spot';
  const cat = (row.category || row.vibe_type || 'Secret Pop-up') as VibeFlashCategory;
  const rawHandle = row.creator_handle || row.creator_name || 'VibeInsider';
  const cleanName = String(rawHandle).replace(/^@/, '');

  return {
    id: row.id,
    source: 'flash',
    kind: 'vibe_flash',
    place_id: row.place_id || undefined,
    place_name: placeName,
    venue_name: placeName,
    address: row.address || placeName,
    title: row.title,
    description: row.description || '',
    category: cat,
    vibe_type: cat,
    creator_id: row.creator_id,
    creator_handle: `@${cleanName}`,
    creator_name: cleanName,
    creator_avatar: row.creator_avatar || '⚡',
    lat: Number(row.lat || 36.8065),
    lng: Number(row.lng || 10.1815),
    starts_at: row.starts_at || row.created_at || new Date().toISOString(),
    expires_at: row.expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    vq_bounty: Number(row.vq_bounty || 25),
    entry_type: row.entry_type || 'Free',
    entry_price_tnd: row.entry_price_tnd || undefined,
    max_capacity: Number(row.max_capacity || 20),
    interested_ids: Array.isArray(row.interested_ids) ? row.interested_ids : [],
    going_ids: Array.isArray(row.going_ids) ? row.going_ids : [],
    claimed_ids: Array.isArray(row.claimed_ids) ? row.claimed_ids : [],
    photo_url: photo,
    photoUrl: photo,
    photos: photo ? [photo] : [],
    created_at: row.created_at || new Date().toISOString(),
  };
}

function emitFlashesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vibequest:flashes-updated'));
  }
}

export async function fetchRawVibeFlashes(): Promise<VibeFlashEvent[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('vibe_flashes')
      .select('*')
      .gt('expires_at', nowIso)
      .order('starts_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapRowToVibeFlash);
  } catch {
    return [];
  }
}

/**
 * Fetch active Vibe Flashes + any Venue Meetup starting within <= 60 minutes or LIVE NOW
 */
export async function fetchActiveVibeFlashes(
  _coords?: { lat: number; lng: number }
): Promise<VibeFlashEvent[]> {
  const [flashes, meetups] = await Promise.all([
    fetchRawVibeFlashes(),
    fetchAllMeetups(),
  ]);

  const nowMs = Date.now();
  const sixtyMinsFromNowMs = nowMs + 60 * 60 * 1000;
  const twoHoursAgoMs = nowMs - 2 * 60 * 60 * 1000;

  const urgentMeetups: VibeFlashEvent[] = meetups
    .filter((m) => {
      const startMs = new Date(m.starts_at).getTime();
      return startMs <= sixtyMinsFromNowMs && startMs >= twoHoursAgoMs;
    })
    .map((m) => {
      const startMs = new Date(m.starts_at).getTime();
      const expiresAt = new Date(startMs + 2 * 3600 * 1000).toISOString();
      const photo = m.photo_url || m.photoUrl;
      const cleanName = m.creator_handle.replace(/^@/, '');
      return {
        id: `meetup_${m.id}`,
        source: 'meetup',
        kind: 'meetup_flash',
        place_id: m.place_id,
        place_name: m.place_name,
        venue_name: m.place_name,
        address: m.place_address || m.place_name,
        title: m.title,
        description: m.description,
        category: 'Meetup',
        vibe_type: 'Meetup',
        creator_id: m.creator_id,
        creator_handle: m.creator_handle,
        creator_name: cleanName,
        creator_avatar: m.creator_avatar || '👥',
        lat: 36.8065,
        lng: 10.1815,
        starts_at: m.starts_at,
        expires_at: expiresAt,
        vq_bounty: 30,
        entry_type: 'Free',
        max_capacity: m.max_attendees || 12,
        interested_ids: [],
        going_ids: m.attendee_ids,
        claimed_ids: [],
        photo_url: photo,
        photoUrl: photo,
        photos: photo ? [photo] : [],
        created_at: m.created_at,
      };
    });

  return [...flashes, ...urgentMeetups].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
}

export async function createVibeFlash(
  input: CreateVibeFlashInput
): Promise<{ success: boolean; flash?: VibeFlashEvent; error?: string }> {
  try {
    let resolvedPhotoUrl = input.photoUrl || input.photo_url || input.photos?.[0];

    if (input.photoFile) {
      const ext = (input.photoFile.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `vibe_flashes/${input.creatorId}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('vibe-media')
        .upload(path, input.photoFile, { cacheControl: '3600', upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from('vibe-media').getPublicUrl(path);
        resolvedPhotoUrl = pub?.publicUrl;
      }
    } else if (resolvedPhotoUrl && resolvedPhotoUrl.startsWith('data:image/')) {
      try {
        const res = await fetch(resolvedPhotoUrl);
        const blob = await res.blob();
        const path = `vibe_flashes/${input.creatorId}_${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('vibe-media')
          .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('vibe-media').getPublicUrl(path);
          if (pub?.publicUrl) resolvedPhotoUrl = pub.publicUrl;
        }
      } catch {
        // Keep data URL if storage upload fails
      }
    }

    const rawHandle = input.creatorHandle || input.creatorName || 'VibeInsider';
    const cleanHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const placeName = (input.placeName || input.venueName || 'Secret Underground Loft').trim();
    const category = input.category || input.vibeType || 'Secret Pop-up';
    const startsAtIso = input.startsAt || new Date().toISOString();
    const durationMins = input.durationMinutes || 120;
    const expiresAtIso =
      input.expiresAt ||
      new Date(new Date(startsAtIso).getTime() + durationMins * 60000).toISOString();

    const payload = {
      place_id: input.placeId || null,
      place_name: placeName,
      title: input.title.trim(),
      description: input.description.trim(),
      category,
      creator_id: input.creatorId,
      creator_handle: cleanHandle,
      creator_avatar: input.creatorAvatar || '⚡',
      lat: input.lat,
      lng: input.lng,
      starts_at: startsAtIso,
      expires_at: expiresAtIso,
      vq_bounty: input.vqBounty || input.vqHuntPool || 25,
      interested_ids: [],
      going_ids: [input.creatorId],
      claimed_ids: [],
      photo_url: resolvedPhotoUrl || null,
    };

    const { data, error } = await supabase
      .from('vibe_flashes')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to publish Vibe Flash' };
    }

    const created = mapRowToVibeFlash({
      ...data,
      address: input.address || placeName,
      entry_type: input.entryType || 'Free',
      entry_price_tnd: input.entryPriceTnd,
      max_capacity: input.maxCapacity || 20,
    });
    emitFlashesUpdated();
    return { success: true, flash: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error creating Vibe Flash' };
  }
}

export const createVibeFlashEvent = createVibeFlash;

export async function toggleVibeFlashRsvp(
  flashId: string,
  userId: string,
  mode: 'interested' | 'going' = 'going',
  userHandle = '@VibeExplorer'
): Promise<{
  success: boolean;
  isInterested: boolean;
  isGoing: boolean;
  interestedCount: number;
  goingCount: number;
  error?: string;
}> {
  try {
    if (flashId.startsWith('meetup_')) {
      const rawMeetupId = flashId.replace(/^meetup_/, '');
      const res = await toggleMeetupRsvp(rawMeetupId, userId, userHandle);
      emitFlashesUpdated();
      return {
        success: res.success,
        isInterested: false,
        isGoing: res.isAttending,
        interestedCount: 0,
        goingCount: res.attendeeCount,
        error: res.error,
      };
    }

    const { data, error } = await supabase.rpc('rpc_toggle_vibe_flash_rsvp', {
      p_flash_id: flashId,
      p_mode: mode,
    });

    if (error) {
      return {
        success: false,
        isInterested: false,
        isGoing: false,
        interestedCount: 0,
        goingCount: 0,
        error: error.message,
      };
    }

    emitFlashesUpdated();
    return {
      success: true,
      isInterested: mode === 'interested' && data?.mode === 'interested',
      isGoing: mode === 'going' && data?.mode === 'going',
      interestedCount: Number(data?.interested_count || 0),
      goingCount: Number(data?.going_count || 0),
    };
  } catch (err: any) {
    return {
      success: false,
      isInterested: false,
      isGoing: false,
      interestedCount: 0,
      goingCount: 0,
      error: err?.message,
    };
  }
}

export async function toggleFlashInterested(flashId: string, userId: string) {
  return toggleVibeFlashRsvp(flashId, userId, 'interested');
}

export async function toggleFlashGoing(flashId: string, userId: string, userHandle?: string) {
  return toggleVibeFlashRsvp(flashId, userId, 'going', userHandle);
}

export async function claimVibeFlashHunt(
  flashId: string,
  distanceMeters: number
): Promise<{ success: boolean; vqEarned: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('rpc_claim_vibe_flash_bounty', {
      p_flash_id: flashId.replace(/^meetup_/, ''),
      p_distance_meters: Math.round(distanceMeters),
    });

    if (error) {
      return { success: false, vqEarned: 0, error: error.message };
    }

    emitFlashesUpdated();
    return {
      success: true,
      vqEarned: Number(data?.vq_rewarded || 25),
    };
  } catch (err: any) {
    return { success: false, vqEarned: 0, error: err?.message };
  }
}

export function subscribeToVibeFlashes(callback: () => void): () => void {
  const handler = () => callback();
  if (typeof window !== 'undefined') {
    window.addEventListener('vibequest:flashes-updated', handler);
    window.addEventListener('vibequest:meetups-updated', handler);
  }

  const channel = supabase
    .channel('public:vibe_flashes_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vibe_flashes' }, () => {
      callback();
    })
    .subscribe();

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('vibequest:flashes-updated', handler);
      window.removeEventListener('vibequest:meetups-updated', handler);
    }
    supabase.removeChannel(channel);
  };
}
