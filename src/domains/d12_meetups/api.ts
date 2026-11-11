import { supabase } from '../../lib/supabase';
import { PlaceMeetup, CreateMeetupInput } from './types';

function mapRowToMeetup(row: any): PlaceMeetup {
  const startsAt = row.starts_at || row.scheduled_at || new Date().toISOString();
  const photo = row.photo_url || row.photoUrl || undefined;
  const placeName = row.place_name || row.place_title || 'Secret Spot';
  const creatorId = row.creator_id || row.host_user_id || 'usr_anonymous';
  const rawHandle = row.creator_handle || row.host_name || 'VibeExplorer';
  const cleanName = String(rawHandle).replace(/^@/, '');
  const cleanHandle = `@${cleanName}`;
  const avatar = row.creator_avatar || row.host_avatar || undefined;

  return {
    id: row.id,
    place_id: row.place_id,
    place_name: placeName,
    place_title: placeName,
    place_address: row.place_address || '',
    place_category: row.place_category || 'Spots',
    creator_id: creatorId,
    creator_handle: cleanHandle,
    creator_avatar: avatar,
    host_user_id: creatorId,
    host_name: cleanName,
    host_avatar: avatar,
    title: row.title,
    description: row.description || '',
    starts_at: startsAt,
    scheduled_at: startsAt,
    max_attendees: Number(row.max_attendees || 8),
    attendee_ids: Array.isArray(row.attendee_ids) ? row.attendee_ids : [],
    attendee_handles: Array.isArray(row.attendee_handles) ? row.attendee_handles : [],
    photo_url: photo,
    photoUrl: photo,
    is_live_checkin: Boolean(row.is_live_checkin),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function emitMeetupsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vibequest:meetups-updated'));
  }
}

export async function fetchAllMeetups(): Promise<PlaceMeetup[]> {
  try {
    const cutoff = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('place_meetups')
      .select('*')
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapRowToMeetup);
  } catch {
    return [];
  }
}

export async function fetchMeetupsByPlaceId(placeId: string): Promise<PlaceMeetup[]> {
  if (!placeId) return [];
  try {
    const cutoff = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('place_meetups')
      .select('*')
      .eq('place_id', placeId)
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapRowToMeetup);
  } catch {
    return [];
  }
}

export const fetchPlaceMeetups = fetchMeetupsByPlaceId;

export async function fetchMeetupsByUser(userId: string): Promise<PlaceMeetup[]> {
  if (!userId) return [];
  try {
    const all = await fetchAllMeetups();
    return all.filter((m) => m.creator_id === userId || m.attendee_ids.includes(userId));
  } catch {
    return [];
  }
}

export async function createPlaceMeetup(
  input: CreateMeetupInput
): Promise<{ success: boolean; meetup?: PlaceMeetup; error?: string }> {
  try {
    let resolvedPhotoUrl = input.photoUrl || input.photo_url;
    const creatorId = input.creatorId || input.hostUserId || 'usr_anonymous';
    const rawHandle = input.creatorHandle || input.hostName || 'VibeExplorer';
    const cleanHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const placeName = input.placeName || input.placeTitle || 'Secret Spot';

    if (input.photoFile) {
      const ext = (input.photoFile.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `meetups/${input.placeId}/${creatorId}_${Date.now()}.${ext}`;
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
        const path = `meetups/${input.placeId}/${creatorId}_${Date.now()}.jpg`;
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

    const startsAtIso =
      input.startsAt || input.scheduledAt || new Date(Date.now() + 30 * 60000).toISOString();

    const payload = {
      place_id: input.placeId,
      place_name: placeName,
      creator_id: creatorId,
      creator_handle: cleanHandle,
      creator_avatar: input.creatorAvatar || input.hostAvatar || '✨',
      title: input.title.trim(),
      description: (input.description || '').trim(),
      starts_at: startsAtIso,
      max_attendees: input.maxAttendees || 8,
      attendee_ids: [creatorId],
      attendee_handles: [cleanHandle],
      photo_url: resolvedPhotoUrl || null,
    };

    const { data, error } = await supabase
      .from('place_meetups')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create meetup in Supabase' };
    }

    const created = mapRowToMeetup({
      ...data,
      place_address: input.placeAddress,
      place_category: input.placeCategory,
      is_live_checkin: input.isLiveCheckin,
    });
    emitMeetupsUpdated();
    return { success: true, meetup: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error creating meetup' };
  }
}

export async function toggleMeetupRsvp(
  meetupId: string,
  _userId: string,
  userHandle = '@VibeExplorer'
): Promise<{
  success: boolean;
  isAttending: boolean;
  attendeesCount: number;
  attendeeCount: number;
  error?: string;
}> {
  try {
    const cleanHandle = userHandle.startsWith('@') ? userHandle : `@${userHandle}`;
    const { data, error } = await supabase.rpc('rpc_toggle_meetup_rsvp', {
      p_meetup_id: meetupId,
      p_user_handle: cleanHandle,
    });

    if (error) {
      return {
        success: false,
        isAttending: false,
        attendeesCount: 0,
        attendeeCount: 0,
        error: error.message,
      };
    }

    const count = Number(data?.attendee_count || 0);
    emitMeetupsUpdated();
    return {
      success: true,
      isAttending: data?.action === 'joined',
      attendeesCount: count,
      attendeeCount: count,
    };
  } catch (err: any) {
    return {
      success: false,
      isAttending: false,
      attendeesCount: 0,
      attendeeCount: 0,
      error: err?.message,
    };
  }
}

export function subscribeToMeetupUpdates(callback: () => void): () => void {
  const handler = () => callback();
  if (typeof window !== 'undefined') {
    window.addEventListener('vibequest:meetups-updated', handler);
  }
  const channel = supabase
    .channel('public:place_meetups_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_meetups' }, () => {
      callback();
    })
    .subscribe();

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('vibequest:meetups-updated', handler);
    }
    supabase.removeChannel(channel);
  };
}
