/**
 * Vibe Flash Domain API
 * Manages fetching, creating, and participating in Vibe Flash events and bridging active meetups (<= 60m).
 */

import { supabase } from '../../lib/supabase';
import { VibeFlashItem, CreateVibeFlashPayload } from './types';
import { fetchAllMeetups } from '../d12_meetups/api';
import { calculateHaversineMeters } from '../d03_vibe_orbit/presenceVerifier';

const FLASH_CACHE_KEY = 'vq_vibe_flashes_cache';
const FLASH_EVENT = 'vq:vibe_flash_updated';

function getLocalFlashes(): VibeFlashItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FLASH_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFlashes(list: VibeFlashItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FLASH_CACHE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(FLASH_EVENT));
  } catch (err) {
    console.warn('Failed to save vibe flashes to cache:', err);
  }
}

export function subscribeToVibeFlashes(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(FLASH_EVENT, handler);
  return () => window.removeEventListener(FLASH_EVENT, handler);
}

/**
 * Fetches active vibe flashes from Supabase and local cache (read-only, no event dispatch).
 */
export async function fetchRawVibeFlashes(): Promise<VibeFlashItem[]> {
  const localList = getLocalFlashes();

  try {
    const { data, error } = await supabase
      .from('vibe_flash_events')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      const dbList: VibeFlashItem[] = data.map((row: any) => ({
        id: String(row.id),
        kind: 'secret_flash',
        title: String(row.title || ''),
        description: String(row.description || ''),
        vibe_type: row.vibe_type || 'Secret Pop-up',
        place_id: row.place_id || undefined,
        venue_name: String(row.venue_name || ''),
        address: String(row.address || ''),
        lat: Number(row.lat || 36.8065),
        lng: Number(row.lng || 10.1815),
        creator_id: String(row.creator_id || ''),
        creator_name: String(row.creator_name || 'Explorer'),
        creator_avatar: row.creator_avatar || undefined,
        starts_at: row.starts_at || new Date().toISOString(),
        expires_at: row.expires_at || new Date(Date.now() + 3600000).toISOString(),
        entry_type: row.entry_type || 'Free',
        entry_price_tnd: row.entry_price_tnd || undefined,
        entry_rules: row.entry_rules || undefined,
        parking_transport_notes: row.parking_transport_notes || undefined,
        photo_url: row.photo_url || undefined,
        photos: row.photo_url ? [row.photo_url] : (Array.isArray(row.photos) ? row.photos : []),
        vq_hunt_pool: Number(row.vq_hunt_pool || 0),
        vq_reward_per_hunter: Number(row.vq_reward_per_hunter || 500),
        max_capacity: Number(row.max_capacity || 20),
        interested_ids: Array.isArray(row.interested_ids) ? row.interested_ids : [],
        going_ids: Array.isArray(row.going_ids) ? row.going_ids : [],
        verified_arrived_ids: Array.isArray(row.verified_arrived_ids) ? row.verified_arrived_ids : [],
        claimed_reward_ids: Array.isArray(row.claimed_reward_ids) ? row.claimed_reward_ids : [],
        created_at: row.created_at || new Date().toISOString()
      }));

      const map = new Map<string, VibeFlashItem>();
      [...dbList, ...localList].forEach(f => map.set(f.id, f));
      const merged = Array.from(map.values()).filter(f => new Date(f.expires_at).getTime() > Date.now());
      // Silent save without dispatching window event on read
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FLASH_CACHE_KEY, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch (err) {
    console.warn('Supabase fetchRawVibeFlashes fallback to local cache:', err);
  }

  return localList.filter(f => new Date(f.expires_at).getTime() > Date.now());
}

/**
 * Automatically bridges active Meetups starting within <= 60 minutes or live now
 * into unified VibeFlashItem items alongside standalone Secret Flashes.
 */
export async function fetchActiveVibeFlashes(userCoords?: { lat: number; lng: number }): Promise<VibeFlashItem[]> {
  const [flashes, meetups] = await Promise.all([
    fetchRawVibeFlashes(),
    fetchAllMeetups()
  ]);

  const now = Date.now();
  const sixtyMinutesMs = 60 * 60 * 1000;

  const meetupFlashes: VibeFlashItem[] = meetups
    .filter(m => {
      const startsTime = new Date(m.scheduled_at).getTime();
      const expiresTime = startsTime + 2 * 60 * 60 * 1000;
      const diffToStart = startsTime - now;
      return diffToStart <= sixtyMinutesMs && expiresTime > now;
    })
    .map(m => ({
      id: `meetup-flash-${m.id}`,
      kind: 'meetup_flash' as const,
      title: m.title,
      description: m.description || `Live pop-up gathering at ${m.place_title}`,
      vibe_type: 'Flash Meetup' as const,
      place_id: m.place_id,
      venue_name: m.place_title,
      address: m.place_address || 'Local Discovery Spot',
      lat: 36.8065,
      lng: 10.1815,
      creator_id: m.host_user_id,
      creator_name: m.host_name,
      creator_avatar: m.host_avatar,
      starts_at: m.scheduled_at,
      expires_at: new Date(new Date(m.scheduled_at).getTime() + 7200000).toISOString(),
      entry_type: 'Free' as const,
      photo_url: m.photo_url || undefined,
      photos: m.photo_url ? [m.photo_url] : [],
      vq_hunt_pool: 0,
      vq_reward_per_hunter: 500,
      max_capacity: 10,
      interested_ids: [],
      going_ids: m.attendee_ids,
      verified_arrived_ids: [],
      claimed_reward_ids: [],
      created_at: m.created_at
    }));

  const combined = [...flashes, ...meetupFlashes];

  if (userCoords) {
    combined.forEach(item => {
      const dist = calculateHaversineMeters(userCoords.lat, userCoords.lng, item.lat, item.lng);
      item.distance_meters = dist;
      item.distance_km = Number((dist / 1000).toFixed(2));
    });
  }

  combined.sort((a, b) => {
    const aStart = new Date(a.starts_at).getTime();
    const bStart = new Date(b.starts_at).getTime();
    const aLive = aStart <= now ? 1 : 0;
    const bLive = bStart <= now ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    if (aStart !== bStart) return aStart - bStart;
    return (a.distance_meters || 0) - (b.distance_meters || 0);
  });

  return combined;
}

/**
 * Creates and publishes a new Vibe Flash Secret Event.
 */
export async function createVibeFlash(payload: CreateVibeFlashPayload): Promise<{
  success: boolean;
  flash?: VibeFlashItem;
  error?: string;
}> {
  const {
    title,
    description,
    vibeType,
    placeId,
    venueName,
    address,
    lat,
    lng,
    creatorId,
    creatorName,
    creatorAvatar,
    startsAt,
    durationMinutes,
    entryType,
    entryPriceTnd,
    entryRules,
    parkingTransportNotes,
    photos,
    photo_url,
    vqHuntPool = 0,
    maxCapacity = 20
  } = payload;

  if (!title.trim()) {
    return { success: false, error: 'Please enter a title for your Vibe Flash.' };
  }

  const startsTime = new Date(startsAt).getTime();
  const expiresTime = startsTime + durationMinutes * 60 * 1000;

  const flashId = `flash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newFlash: VibeFlashItem = {
    id: flashId,
    kind: 'secret_flash',
    title: title.trim(),
    description: description?.trim() || '',
    vibe_type: vibeType,
    place_id: placeId,
    venue_name: venueName,
    address,
    lat,
    lng,
    creator_id: creatorId,
    creator_name: creatorName,
    creator_avatar: creatorAvatar,
    starts_at: startsAt,
    expires_at: new Date(expiresTime).toISOString(),
    entry_type: entryType,
    entry_price_tnd: entryPriceTnd,
    entry_rules: entryRules,
    parking_transport_notes: parkingTransportNotes,
    photos: photos || (photo_url ? [photo_url] : []),
    photo_url: photo_url || undefined,
    vq_hunt_pool: vqHuntPool,
    vq_reward_per_hunter: 500,
    max_capacity: maxCapacity,
    interested_ids: [],
    going_ids: [creatorId],
    verified_arrived_ids: [],
    claimed_reward_ids: [],
    created_at: new Date().toISOString()
  };

  const list = getLocalFlashes();
  list.unshift(newFlash);
  saveLocalFlashes(list);

  try {
    await supabase.from('vibe_flash_events').insert([{
      id: flashId,
      title: newFlash.title,
      description: newFlash.description,
      vibe_type: newFlash.vibe_type,
      place_id: newFlash.place_id,
      venue_name: newFlash.venue_name,
      address: newFlash.address,
      lat: newFlash.lat,
      lng: newFlash.lng,
      creator_id: newFlash.creator_id,
      creator_name: newFlash.creator_name,
      creator_avatar: newFlash.creator_avatar,
      starts_at: newFlash.starts_at,
      expires_at: newFlash.expires_at,
      entry_type: newFlash.entry_type,
      entry_price_tnd: newFlash.entry_price_tnd,
      entry_rules: newFlash.entry_rules,
      parking_transport_notes: newFlash.parking_transport_notes,
      photos: newFlash.photos,
      photo_url: newFlash.photo_url,
      vq_hunt_pool: newFlash.vq_hunt_pool,
      max_capacity: newFlash.max_capacity,
      going_ids: newFlash.going_ids
    }]);
  } catch (err) {
    console.warn('Supabase vibe_flash_events insert fallback to local:', err);
  }

  return { success: true, flash: newFlash };
}

export async function toggleFlashInterested(flashId: string, userId: string): Promise<{ success: boolean; isInterested: boolean }> {
  const list = getLocalFlashes();
  const flash = list.find(f => f.id === flashId);
  if (!flash) return { success: false, isInterested: false };

  const idx = flash.interested_ids.indexOf(userId);
  let isInterested = false;
  if (idx !== -1) {
    flash.interested_ids.splice(idx, 1);
  } else {
    flash.interested_ids.push(userId);
    const gIdx = flash.going_ids.indexOf(userId);
    if (gIdx !== -1) flash.going_ids.splice(gIdx, 1);
    isInterested = true;
  }

  saveLocalFlashes(list);
  return { success: true, isInterested };
}

export async function toggleFlashGoing(flashId: string, userId: string): Promise<{ success: boolean; isGoing: boolean }> {
  const list = getLocalFlashes();
  const flash = list.find(f => f.id === flashId);
  if (!flash) return { success: false, isGoing: false };

  const idx = flash.going_ids.indexOf(userId);
  let isGoing = false;
  if (idx !== -1) {
    flash.going_ids.splice(idx, 1);
  } else {
    if (flash.going_ids.length >= flash.max_capacity) {
      return { success: false, isGoing: false };
    }
    flash.going_ids.push(userId);
    const iIdx = flash.interested_ids.indexOf(userId);
    if (iIdx !== -1) flash.interested_ids.splice(iIdx, 1);
    isGoing = true;
  }

  saveLocalFlashes(list);
  return { success: true, isGoing };
}
