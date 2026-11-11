/**
 * Business Promotions & Sponsored Check-in Reward Pool Domain API
 * Allows any VibeQuest user with VQ tokens to sponsor/promote a business and fund check-in rewards.
 */

import { supabase } from '../../lib/supabase';
import { executeVqTransfer } from '../d06_purse';
import { recordCheckinHistory } from './searchHistory';

export interface PlacePromotion {
  id: string;
  place_id: string;
  place_title: string;
  sponsor_user_id: string;
  total_vq_funded: number;
  remaining_vq_pool: number;
  reward_per_checkin: number;
  status: 'active' | 'depleted' | 'cancelled';
  created_at: string;
  is_active?: boolean;
  remaining_pool?: number;
}

export interface PlaceCheckinRecord {
  id: string;
  place_id: string;
  place_title: string;
  user_id: string;
  vq_earned: number;
  promotion_id?: string;
  created_at: string;
}

const PROMOTIONS_CACHE_KEY = 'vq_place_promotions_cache';
const CHECKINS_CACHE_KEY = 'vq_place_checkins_cache';

function getLocalPromotions(): Record<string, PlacePromotion> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROMOTIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPromotions(map: Record<string, PlacePromotion>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMOTIONS_CACHE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save promotions to cache:', err);
  }
}

function getLocalCheckins(): PlaceCheckinRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHECKINS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCheckins(list: PlaceCheckinRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHECKINS_CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save checkins to cache:', err);
  }
}

/**
 * Fetches all currently active promotions, keyed by place_id.
 */
export async function fetchActivePromotions(): Promise<Record<string, PlacePromotion>> {
  const localMap = getLocalPromotions();
  try {
    const { data, error } = await supabase
      .from('place_promotions')
      .select('*')
      .eq('status', 'active');

    if (!error && Array.isArray(data)) {
      const dbMap: Record<string, PlacePromotion> = {};
      data.forEach((row: any) => {
        if (row.place_id && row.remaining_vq_pool >= (row.reward_per_checkin || 10)) {
          dbMap[row.place_id] = {
            id: String(row.id),
            place_id: String(row.place_id),
            place_title: String(row.place_title || ''),
            sponsor_user_id: String(row.sponsor_user_id || ''),
            total_vq_funded: Number(row.total_vq_funded || 0),
            remaining_vq_pool: Number(row.remaining_vq_pool || 0),
            reward_per_checkin: Number(row.reward_per_checkin || 50),
            status: row.status,
            created_at: row.created_at || new Date().toISOString()
          };
        }
      });
      // Merge with any local offline additions
      const merged = { ...localMap, ...dbMap };
      saveLocalPromotions(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching promotions from Supabase, using local cache:', err);
  }

  // Filter local map for active pools with funds
  const activeLocal: Record<string, PlacePromotion> = {};
  Object.values(localMap).forEach(promo => {
    if (promo.status === 'active' && promo.remaining_vq_pool >= promo.reward_per_checkin) {
      activeLocal[promo.place_id] = promo;
    }
  });
  return activeLocal;
}

/**
 * Fetches the active promotion for a specific place asynchronously.
 */
export async function fetchPromotionForPlace(placeId: string): Promise<PlacePromotion | null> {
  const activeMap = await fetchActivePromotions();
  return activeMap[placeId] || null;
}

/**
 * Returns active promotion from synchronous local cache if present.
 */
export function getActivePlacePromotion(placeId: string): PlacePromotion | null {
  const localMap = getLocalPromotions();
  const promo = localMap[placeId];
  if (promo && promo.status === 'active' && promo.remaining_vq_pool >= promo.reward_per_checkin) {
    return promo;
  }
  return null;
}

/**
 * Creates or tops up a business promotion with real VQ tokens.
 */
export async function createOrFundPromotion(payload: {
  placeId: string;
  placeTitle: string;
  sponsorUserId: string;
  totalVqFunded: number;
  rewardPerCheckin: number;
}): Promise<{ success: boolean; promotion?: PlacePromotion; error?: string }> {
  const { placeId, placeTitle, sponsorUserId, totalVqFunded, rewardPerCheckin } = payload;

  if (totalVqFunded <= 0 || rewardPerCheckin <= 0) {
    return { success: false, error: 'Funded amount and reward per check-in must be greater than zero.' };
  }

  if (rewardPerCheckin > totalVqFunded) {
    return { success: false, error: 'Reward per check-in cannot exceed total funded VQ pool.' };
  }

  // Deduct tokens from sponsor's VQ Purse
  const transfer = await executeVqTransfer({
    toUserId: 'sponsor_pool',
    amount: totalVqFunded,
    type: 'spend',
    description: `Promoted ${placeTitle} with check-in reward pool (+${rewardPerCheckin} VQ)`
  });

  if (!transfer.success) {
    return { success: false, error: transfer.error || 'Failed to allocate VQ tokens from purse.' };
  }

  const promoId = `promo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const promotion: PlacePromotion = {
    id: promoId,
    place_id: placeId,
    place_title: placeTitle,
    sponsor_user_id: sponsorUserId,
    total_vq_funded: totalVqFunded,
    remaining_vq_pool: totalVqFunded,
    reward_per_checkin: rewardPerCheckin,
    status: 'active',
    created_at: new Date().toISOString()
  };

  // Update local cache immediately
  const localMap = getLocalPromotions();
  localMap[placeId] = promotion;
  saveLocalPromotions(localMap);

  // Attempt database write
  try {
    await supabase.from('place_promotions').insert([{
      place_id: placeId,
      place_title: placeTitle,
      sponsor_user_id: sponsorUserId,
      total_vq_funded: totalVqFunded,
      remaining_vq_pool: totalVqFunded,
      reward_per_checkin: rewardPerCheckin,
      status: 'active'
    }]);
  } catch (err) {
    console.warn('Supabase promotion insert fallback to local:', err);
  }

  return { success: true, promotion };
}

/**
 * Records a check-in at a place, claims check-in rewards if promoted,
 * and increments real in-app check-in count.
 */
export async function recordPlaceCheckin(payload: {
  placeId: string;
  placeTitle: string;
  placeCategory?: string;
  userId: string;
}): Promise<{
  success: boolean;
  vqEarned: number;
  newCheckinCount: number;
  remainingPool?: number;
  isPromoted: boolean;
  error?: string;
}> {
  const { placeId, placeTitle, placeCategory = 'Spots', userId } = payload;

  const activePromo = await fetchPromotionForPlace(placeId);
  let vqEarned = 0;
  let remainingPool: number | undefined;

  if (activePromo && activePromo.remaining_vq_pool >= activePromo.reward_per_checkin) {
    vqEarned = activePromo.reward_per_checkin;
    activePromo.remaining_vq_pool -= vqEarned;
    remainingPool = activePromo.remaining_vq_pool;
    if (activePromo.remaining_vq_pool < activePromo.reward_per_checkin) {
      activePromo.status = 'depleted';
    }

    // Update local promotion cache
    const localMap = getLocalPromotions();
    localMap[placeId] = activePromo;
    saveLocalPromotions(localMap);

    // Credit user's VQ purse
    await executeVqTransfer({
      toUserId: userId,
      amount: vqEarned,
      type: 'earned',
      description: `Check-in reward at ${placeTitle} (+${vqEarned} VQ claimed)`
    });

    // Update Supabase promotion pool
    try {
      await supabase
        .from('place_promotions')
        .update({
          remaining_vq_pool: activePromo.remaining_vq_pool,
          status: activePromo.status,
          updated_at: new Date().toISOString()
        })
        .eq('place_id', placeId);
    } catch {}
  }

  // Create check-in record
  const checkinRecord: PlaceCheckinRecord = {
    id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    place_id: placeId,
    place_title: placeTitle,
    user_id: userId,
    vq_earned: vqEarned,
    promotion_id: activePromo?.id,
    created_at: new Date().toISOString()
  };

  const allCheckins = getLocalCheckins();
  allCheckins.push(checkinRecord);
  saveLocalCheckins(allCheckins);

  // Record into search/habit history
  recordCheckinHistory(placeId, placeCategory);

  try {
    await supabase.from('place_checkins').insert([{
      place_id: placeId,
      place_title: placeTitle,
      user_id: userId,
      vq_earned: vqEarned
    }]);
  } catch {}

  const placeCheckins = allCheckins.filter(c => c.place_id === placeId);

  return {
    success: true,
    vqEarned,
    newCheckinCount: placeCheckins.length,
    remainingPool,
    isPromoted: Boolean(activePromo && activePromo.status === 'active')
  };
}

/**
 * Returns true in-app checkin count for a place (defaulting to 0 when unvisited).
 */
export async function fetchPlaceCheckinsCount(placeId: string): Promise<number> {
  const localList = getLocalCheckins().filter(c => c.place_id === placeId);
  try {
    const { count, error } = await supabase
      .from('place_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', placeId);

    if (!error && typeof count === 'number') {
      return Math.max(count, localList.length);
    }
  } catch {}
  return localList.length;
}

/**
 * Claims a check-in reward for a place.
 */
export async function claimCheckinReward(
  placeId: string,
  userId: string,
  placeTitle?: string
) {
  return recordPlaceCheckin({
    placeId,
    placeTitle: placeTitle || 'Spot',
    userId
  });
}
