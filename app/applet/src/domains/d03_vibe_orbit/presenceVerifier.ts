import { supabase } from '../../lib/supabase';

export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const calculateDistanceMeters = calculateHaversineMeters;

export async function uploadReceiptPhotoToStorage(fileOrBlob: File | Blob): Promise<string | null> {
  try {
    const fileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    const { data, error } = await supabase.storage
      .from('vibe-media')
      .upload(fileName, fileOrBlob, { cacheControl: '3600', upsert: false });
    if (error || !data) return null;
    const { data: publicUrlData } = supabase.storage.from('vibe-media').getPublicUrl(data.path);
    return publicUrlData?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function submitLiveCheckVerification(payload: {
  placeId: string;
  placeTitle: string;
  placeCategory?: string;
  userId: string;
  userName?: string;
  userHandle?: string;
  userAvatar?: string;
  distanceMeters: number;
  hasReceipt: boolean;
  receiptPhotoUrl?: string;
  verdict?: 'yes' | 'no';
  initialRating?: number;
}): Promise<{ success: boolean; vqEarned: number; resultingConfidence?: number; error?: string }> {
  const {
    placeId,
    placeTitle,
    placeCategory = 'Spots',
    userId,
    userName = 'Voyager',
    userHandle = '@voyager',
    userAvatar = '',
    distanceMeters,
    hasReceipt,
    receiptPhotoUrl,
    verdict = 'yes',
    initialRating = 4.2
  } = payload;

  if (distanceMeters > 33) {
    return { success: false, vqEarned: 0, error: 'Distance exceeds 33-meter strict geofence.' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_submit_checkin_and_validation', {
      p_place_id: placeId,
      p_place_title: placeTitle,
      p_place_category: placeCategory,
      p_user_id: userId,
      p_user_name: userName,
      p_user_handle: userHandle,
      p_user_avatar: userAvatar,
      p_distance_meters: distanceMeters,
      p_verdict: verdict,
      p_initial_rating: initialRating,
      p_has_livecheck_receipt: hasReceipt,
      p_receipt_photo_url: receiptPhotoUrl || null
    });
    if (error || !data?.success) {
      return { success: false, vqEarned: 0, error: error?.message || data?.error || 'LiveCheck RPC failed' };
    }
    return {
      success: true,
      vqEarned: Number(data.vq_rewarded || 0),
      resultingConfidence: Number(data.resulting_confidence || 85)
    };
  } catch (err: any) {
    return { success: false, vqEarned: 0, error: err?.message || 'Network error' };
  }
}
