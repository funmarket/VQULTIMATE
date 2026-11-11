/**
 * Spot Meetups Domain API
 * Handles organizing, discovering, joining, and propagating meetups across:
 * 1. Spot Details Modal
 * 2. User Profile Card
 * 3. Gossip Feed
 * 4. Local Feed
 * 5. My Network Feed
 */

import { supabase } from '../../lib/supabase';
import { PlaceMeetup, CreateMeetupPayload } from './types';

const MEETUPS_CACHE_KEY = 'vq_place_meetups_cache';
const MEETUPS_EVENT = 'vq:meetup_updated';

function getLocalMeetups(): PlaceMeetup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEETUPS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMeetups(list: PlaceMeetup[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEETUPS_CACHE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(MEETUPS_EVENT));
  } catch (err) {
    console.warn('Failed to save meetups to cache:', err);
  }
}

export function subscribeToMeetupUpdates(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(MEETUPS_EVENT, handler);
  return () => window.removeEventListener(MEETUPS_EVENT, handler);
}

/**
 * Fetches all active meetups across the application.
 */
export async function fetchAllMeetups(): Promise<PlaceMeetup[]> {
  const localList = getLocalMeetups();

  try {
    const { data, error } = await supabase
      .from('place_meetups')
      .select('*')
      .eq('status', 'active')
      .order('scheduled_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      const dbList: PlaceMeetup[] = data.map((row: any) => ({
        id: String(row.id),
        place_id: String(row.place_id),
        place_title: String(row.place_title || ''),
        place_address: String(row.place_address || ''),
        place_category: String(row.place_category || 'Spots'),
        host_user_id: String(row.host_user_id),
        host_name: String(row.host_name || 'Explorer'),
        host_avatar: row.host_avatar || undefined,
        title: String(row.title),
        description: row.description || undefined,
        scheduled_at: row.scheduled_at || new Date().toISOString(),
        is_live_checkin: Boolean(row.is_live_checkin),
        attendee_ids: Array.isArray(row.attendee_ids) ? row.attendee_ids : [],
        status: row.status || 'active',
        created_at: row.created_at || new Date().toISOString()
      }));

      const map = new Map<string, PlaceMeetup>();
      [...dbList, ...localList].forEach(m => map.set(m.id, m));
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      saveLocalMeetups(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase fetchAllMeetups fallback to local cache:', err);
  }

  return localList;
}

/**
 * Fetches all meetups for a specific place.
 */
export async function fetchMeetupsByPlaceId(placeId: string): Promise<PlaceMeetup[]> {
  const all = await fetchAllMeetups();
  return all.filter(m => m.place_id === placeId && m.status === 'active');
}

/**
 * Fetches all meetups hosted or joined by a specific user.
 */
export async function fetchMeetupsByUser(userId: string): Promise<PlaceMeetup[]> {
  if (!userId) return [];
  const all = await fetchAllMeetups();
  const cleanId = userId.replace(/^usr_/, '');
  return all.filter(m =>
    (m.host_user_id === userId || m.host_user_id === cleanId || m.host_user_id === 'usr_' + cleanId) ||
    m.attendee_ids.some(id => id === userId || id === cleanId || id === 'usr_' + cleanId)
  );
}

/**
 * Creates and publishes a new Meetup at a place.
 */
export async function createPlaceMeetup(payload: CreateMeetupPayload): Promise<{
  success: boolean;
  meetup?: PlaceMeetup;
  error?: string;
}> {
  const {
    placeId,
    placeTitle,
    placeAddress,
    placeCategory,
    hostUserId,
    hostName,
    hostAvatar,
    title,
    description,
    scheduledAt,
    isLiveCheckin = false
  } = payload;

  if (!title.trim()) {
    return { success: false, error: 'Please enter a title or vibe for the meetup.' };
  }

  const meetupId = `meetup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const meetup: PlaceMeetup = {
    id: meetupId,
    place_id: placeId,
    place_title: placeTitle,
    place_address: placeAddress,
    place_category: placeCategory,
    host_user_id: hostUserId,
    host_name: hostName,
    host_avatar: hostAvatar,
    title: title.trim(),
    description: description?.trim(),
    scheduled_at: scheduledAt || new Date().toISOString(),
    is_live_checkin: isLiveCheckin,
    attendee_ids: [hostUserId], // Host is first attendee
    status: 'active',
    created_at: new Date().toISOString()
  };

  const localList = getLocalMeetups();
  localList.unshift(meetup);
  saveLocalMeetups(localList);

  try {
    await supabase.from('place_meetups').insert([{
      id: meetupId,
      place_id: placeId,
      place_title: placeTitle,
      place_address: placeAddress,
      place_category: placeCategory,
      host_user_id: hostUserId,
      host_name: hostName,
      host_avatar: hostAvatar || null,
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: meetup.scheduled_at,
      is_live_checkin: isLiveCheckin,
      attendee_ids: [hostUserId],
      status: 'active'
    }]);
  } catch (err) {
    console.warn('Supabase meetup insert fallback to local:', err);
  }

  return { success: true, meetup };
}

/**
 * Joins or leaves (RSVP) a meetup.
 */
export async function toggleMeetupRsvp(meetupId: string, userId: string): Promise<{
  success: boolean;
  isAttending: boolean;
  attendeesCount: number;
  error?: string;
}> {
  if (!userId) {
    return { success: false, isAttending: false, attendeesCount: 0, error: 'Authentication required' };
  }

  const all = getLocalMeetups();
  const meetup = all.find(m => m.id === meetupId);
  if (!meetup) {
    return { success: false, isAttending: false, attendeesCount: 0, error: 'Meetup not found' };
  }

  const isAttending = meetup.attendee_ids.includes(userId);
  if (isAttending) {
    // If not the host, allow leaving
    if (meetup.host_user_id === userId) {
      return { success: true, isAttending: true, attendeesCount: meetup.attendee_ids.length };
    }
    meetup.attendee_ids = meetup.attendee_ids.filter(id => id !== userId);
  } else {
    meetup.attendee_ids.push(userId);
  }

  saveLocalMeetups(all);

  try {
    await supabase
      .from('place_meetups')
      .update({ attendee_ids: meetup.attendee_ids })
      .eq('id', meetupId);
  } catch {}

  return {
    success: true,
    isAttending: !isAttending,
    attendeesCount: meetup.attendee_ids.length
  };
}
