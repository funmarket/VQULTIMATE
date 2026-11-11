import { supabase } from '../../lib/supabase';
import { PlaceMeetup } from './types';

export async function fetchPlaceMeetups(placeId?: string): Promise<PlaceMeetup[]> {
  try {
    let query = supabase.from('place_meetups').select('*');
    if (placeId) {
      query = query.eq('place_id', placeId);
    }
    const { data, error } = await query.order('starts_at', { ascending: true });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: String(row.id),
      place_id: String(row.place_id),
      place_title: String(row.place_title || ''),
      place_address: String(row.place_address || ''),
      place_category: String(row.place_category || 'Spots'),
      lat: Number(row.lat || 0),
      lng: Number(row.lng || 0),
      host_user_id: String(row.host_user_id || ''),
      host_name: String(row.host_name || 'Host'),
      host_avatar: row.host_avatar || '',
      title: String(row.title || ''),
      description: String(row.description || ''),
      photo_url: row.photo_url || '',
      starts_at: row.starts_at || new Date().toISOString(),
      expires_at: row.expires_at || new Date(Date.now() + 3600000).toISOString(),
      max_capacity: Number(row.max_capacity || 10),
      attendee_ids: row.attendee_ids || [],
      verified_arrived_ids: row.verified_arrived_ids || []
    }));
  } catch {
    return [];
  }
}

export async function createPlaceMeetup(payload: {
  placeId: string;
  placeTitle: string;
  placeAddress?: string;
  placeCategory?: string;
  lat?: number;
  lng?: number;
  hostUserId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  description: string;
  photoUrl?: string;
  startsAt: string;
  expiresAt: string;
  maxCapacity?: number;
}): Promise<{ success: boolean; meetup?: PlaceMeetup; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('place_meetups')
      .insert([{
        place_id: payload.placeId,
        place_title: payload.placeTitle,
        place_address: payload.placeAddress || '',
        place_category: payload.placeCategory || 'Spots',
        lat: payload.lat || 0,
        lng: payload.lng || 0,
        host_user_id: payload.hostUserId,
        host_name: payload.hostName,
        host_avatar: payload.hostAvatar || '',
        title: payload.title,
        description: payload.description,
        photo_url: payload.photoUrl || null,
        starts_at: payload.startsAt,
        expires_at: payload.expiresAt,
        max_capacity: payload.maxCapacity || 10,
        attendee_ids: [payload.hostUserId]
      }])
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create meetup' };
    }
    return { success: true, meetup: data as PlaceMeetup };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Meetup network error' };
  }
}

export async function toggleMeetupRsvp(meetupId: string, userId: string): Promise<{ success: boolean; isAttending?: boolean; attendeeCount?: number }> {
  try {
    const { data, error } = await supabase.rpc('rpc_toggle_meetup_rsvp', {
      p_meetup_id: meetupId,
      p_user_id: userId
    });
    if (error || !data?.success) {
      return { success: false };
    }
    return { success: true, isAttending: data.is_attending, attendeeCount: data.attendee_count };
  } catch {
    return { success: false };
  }
}
