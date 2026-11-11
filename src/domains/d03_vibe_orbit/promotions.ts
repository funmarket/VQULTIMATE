/**
 * Business Promotions & Sponsored Check-in Reward Pool Domain API
 * Server-authoritative Supabase implementation via place_promotions and rpc_fund_place_promotion.
 */

import { supabase } from '@/lib/supabase';
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

function mapPromotionRow(row: any): PlacePromotion {
  const pool = Number(row.remaining_vq_pool || 0);
  const reward = Number(row.reward_per_checkin || 500);
  const isActive = row.status === 'active' && pool >= reward;
  return {
    id: String(row.id),
    place_id: String(row.place_id),
    place_title: String(row.place_title || ''),
    sponsor_user_id: String(row.sponsor_user_id || ''),
    total_vq_funded: Number(row.total_vq_funded || 0),
    remaining_vq_pool: pool,
    reward_per_checkin: reward,
    status: row.status || 'active',
    created_at: row.created_at || new Date().toISOString(),
    is_active: isActive,
    remaining_pool: pool
  };
}

/**
 * Fetches all currently active promotions from Supabase, keyed by place_id.
 */
export async function fetchActivePromotions(): Promise<Record<string, PlacePromotion>> {
  const { data, error } = await supabase
    .from('place_promotions')
    .select('*')
    .eq('status', 'active');

  if (error || !Array.isArray(data)) {
    return {};
  }

  const dbMap: Record<string, PlacePromotion> = {};
  data.forEach((row: any) => {
    const promo = mapPromotionRow(row);
    if (promo.place_id && promo.remaining_vq_pool >= promo.reward_per_checkin) {
      dbMap[promo.place_id] = promo;
    }
  });
  return dbMap;
}

/**
 * Fetches the active promotion for a specific place from Supabase.
 */
export async function fetchPromotionForPlace(placeId: string): Promise<PlacePromotion | null> {
  if (!placeId) return null;
  const { data, error } = await supabase
    .from('place_promotions')
    .select('*')
    .eq('place_id', placeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const promo = mapPromotionRow(data[0]);
  return promo.remaining_vq_pool >= promo.reward_per_checkin ? promo : null;
}

/**
 * Synchronous helper retained for backward-compatible callers; returns null to defer to async Supabase state.
 */
export function getActivePlacePromotion(_placeId: string): PlacePromotion | null {
  return null;
}

/**
 * Atomically funds a business promotion via rpc_fund_place_promotion.
 * Do NOT call executeVqTransfer here because rpc_fund_place_promotion already deducts
 * available_balance from vq_accounts and logs the transaction in vq_transactions.
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

  const { data, error } = await supabase.rpc('rpc_fund_place_promotion', {
    p_place_id: placeId,
    p_place_title: placeTitle,
    p_sponsor_user_id: sponsorUserId,
    p_vq_amount: totalVqFunded,
    p_reward_per_checkin: rewardPerCheckin
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || !data.success) {
    return { success: false, error: data?.error || 'Failed to fund business promotion.' };
  }

  return {
    success: true,
    promotion: mapPromotionRow(data.promotion)
  };
}

/**
 * Records a check-in at a place via Supabase.
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

  recordCheckinHistory(placeId, placeCategory);

  const count = await fetchPlaceCheckinsCount(placeId);
  const promo = await fetchPromotionForPlace(placeId);

  return {
    success: true,
    vqEarned: 0,
    newCheckinCount: count,
    remainingPool: promo?.remaining_vq_pool,
    isPromoted: Boolean(promo)
  };
}

/**
 * Returns true in-app checkin count for a place from Supabase place_checkins.
 */
export async function fetchPlaceCheckinsCount(placeId: string): Promise<number> {
  if (!placeId) return 0;
  const { count, error } = await supabase
    .from('place_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('place_id', placeId);

  if (error || typeof count !== 'number') {
    return 0;
  }
  return count;
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
