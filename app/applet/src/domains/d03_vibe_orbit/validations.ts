import { supabase } from '../../lib/supabase';
import { PlaceValidation } from './types';

export async function fetchValidationsForPlace(placeId: string): Promise<PlaceValidation[]> {
  try {
    const { data, error } = await supabase
      .from('place_validations')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: String(row.id),
      place_id: String(row.place_id),
      user_id: String(row.user_id),
      verdict: row.verdict,
      confidence_delta: Number(row.confidence_delta || 0),
      resulting_confidence: Number(row.resulting_confidence || 80),
      vibe_tags: row.vibe_tags || [],
      comment: row.comment || '',
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function submitPlaceValidation(payload: {
  placeId: string;
  userId: string;
  verdict: 'yes' | 'no';
  initialRating?: number;
  vibeTags?: string[];
  comment?: string;
  distanceMeters: number;
}): Promise<{ success: boolean; resultingConfidence?: number; error?: string }> {
  const { placeId, userId, verdict, initialRating = 4.2, vibeTags = [], comment = '', distanceMeters } = payload;
  if (distanceMeters > 33) {
    return { success: false, error: 'Must be within 33 meters to validate.' };
  }
  try {
    const { data, error } = await supabase.rpc('rpc_submit_checkin_and_validation', {
      p_place_id: placeId,
      p_place_title: 'Spot',
      p_place_category: 'Spots',
      p_user_id: userId,
      p_user_name: 'Voyager',
      p_user_handle: '@voyager',
      p_user_avatar: '',
      p_distance_meters: distanceMeters,
      p_verdict: verdict,
      p_initial_rating: initialRating,
      p_has_livecheck_receipt: false,
      p_receipt_photo_url: null,
      p_vibe_tags: vibeTags,
      p_comment: comment
    });
    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error || 'Validation RPC failed' };
    }
    return { success: true, resultingConfidence: data.resulting_confidence };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}
