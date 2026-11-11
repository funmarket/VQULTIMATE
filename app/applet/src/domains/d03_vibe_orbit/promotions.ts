import { supabase } from '../../lib/supabase';
import { PlacePromotion } from './types';
import { executeVqTransfer } from '../d06_purse/api';

export async function fetchActivePromotions(): Promise<Record<string, PlacePromotion>> {
  try {
    const { data, error } = await supabase
      .from('place_promotions')
      .select('*')
      .eq('status', 'active');
    if (error || !data) return {};
    const map: Record<string, PlacePromotion> = {};
    data.forEach((row: any) => {
      map[row.place_id] = {
        id: String(row.id),
        place_id: String(row.place_id),
        place_title: String(row.place_title || ''),
        sponsor_user_id: String(row.sponsor_user_id || ''),
        total_vq_funded: Number(row.total_vq_funded || 0),
        remaining_vq_pool: Number(row.remaining_vq_pool || 0),
        reward_per_checkin: Number(row.reward_per_checkin || 500),
        status: row.status,
        created_at: row.created_at || new Date().toISOString()
      };
    });
    return map;
  } catch {
    return {};
  }
}

export async function fetchPromotionForPlace(placeId: string): Promise<PlacePromotion | null> {
  const map = await fetchActivePromotions();
  return map[placeId] || null;
}

export async function createOrFundPromotion(payload: {
  placeId: string;
  placeTitle: string;
  sponsorUserId: string;
  totalVqFunded: number;
  rewardPerCheckin: number;
}): Promise<{ success: boolean; promotion?: PlacePromotion; error?: string }> {
  const { placeId, placeTitle, sponsorUserId, totalVqFunded, rewardPerCheckin } = payload;
  if (totalVqFunded <= 0 || rewardPerCheckin <= 0) {
    return { success: false, error: 'Funded amount and reward must be greater than zero.' };
  }

  const transfer = await executeVqTransfer({
    toUserId: 'sponsor_pool',
    amount: totalVqFunded,
    type: 'spend',
    description: `Promoted ${placeTitle} with reward pool (+${rewardPerCheckin} VQ)`
  });
  if (!transfer.success) {
    return { success: false, error: transfer.error || 'Failed to allocate VQ tokens.' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_fund_place_promotion', {
      p_place_id: placeId,
      p_place_title: placeTitle,
      p_user_id: sponsorUserId,
      p_vq_amount: totalVqFunded,
      p_reward_per_checkin: rewardPerCheckin
    });
    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error || 'Database RPC promotion funding failed' };
    }
    return {
      success: true,
      promotion: {
        id: data.promotion_id || `promo-${Date.now()}`,
        place_id: placeId,
        place_title: placeTitle,
        sponsor_user_id: sponsorUserId,
        total_vq_funded: totalVqFunded,
        remaining_vq_pool: totalVqFunded,
        reward_per_checkin: rewardPerCheckin,
        status: 'active',
        created_at: new Date().toISOString()
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Promotion network error' };
  }
}

export async function fetchPlaceCheckinsCount(placeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('place_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', placeId);
    if (!error && typeof count === 'number') {
      return count;
    }
  } catch {}
  return 0;
}
