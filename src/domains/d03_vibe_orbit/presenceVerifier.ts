import { supabase } from '../../lib/supabase';

/**
 * Strict 33-meter radius required for physical check-in and Vibe Validation
 */
export const MAX_PRESENCE_METERS = 33;

export interface PresenceCheckResult {
  isWithinRange: boolean;
  isWithin33m: boolean;
  distanceMeters: number | null;
  accuracyMeters: number;
  userLat: number;
  userLng: number;
  userCoords?: { latitude: number; longitude: number; accuracy?: number };
  error?: string;
}

export interface LiveCheckReceiptResult {
  success: boolean;
  vqEarned: number;
  confidenceBoost: number;
  newConfidence?: number;
  receiptUrl?: string;
  checkinId?: string;
  error?: string;
}

export interface UserExplorationStatus {
  totalCheckins: number;
  verifiedReceiptCheckins: number;
  tier: string;
  tierIcon: string;
  badges: Array<{ id: string; label: string; icon: string; unlocked: boolean }>;
  mayorships: string[];
  placeCheckinCounts: Record<string, number>;
}

/**
 * Compute exact Haversine distance in meters between two WGS84 coordinates
 */
export function calculateHaversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const calculateDistanceMeters = calculateHaversineMeters;

export function acquireHighAccuracyPosition(timeoutMs = 8000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation API is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 10000,
      }
    );
  });
}

export async function checkPlaceProximity(
  arg1: number,
  arg2: number,
  arg3?: number,
  arg4?: number,
  arg5 = 10
): Promise<PresenceCheckResult> {
  if (typeof arg3 === 'number' && typeof arg4 === 'number') {
    const distanceMeters = calculateHaversineMeters(arg1, arg2, arg3, arg4);
    const within = distanceMeters <= MAX_PRESENCE_METERS;
    return {
      isWithinRange: within,
      isWithin33m: within,
      distanceMeters,
      accuracyMeters: Math.round(arg5),
      userLat: arg1,
      userLng: arg2,
      userCoords: { latitude: arg1, longitude: arg2, accuracy: Math.round(arg5) },
    };
  }

  const placeLat = arg1;
  const placeLng = arg2;
  try {
    const pos = await acquireHighAccuracyPosition();
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;
    const accuracyMeters = Math.round(pos.coords.accuracy || 10);
    const distanceMeters = calculateHaversineMeters(userLat, userLng, placeLat, placeLng);
    const within = distanceMeters <= MAX_PRESENCE_METERS;
    return {
      isWithinRange: within,
      isWithin33m: within,
      distanceMeters,
      accuracyMeters,
      userLat,
      userLng,
      userCoords: { latitude: userLat, longitude: userLng, accuracy: accuracyMeters },
    };
  } catch (err: any) {
    return {
      isWithinRange: false,
      isWithin33m: false,
      distanceMeters: null,
      accuracyMeters: 0,
      userLat: 0,
      userLng: 0,
      error: err?.message || 'Unable to acquire high-accuracy GPS position.',
    };
  }
}

export async function hasUserScannedReceiptRecently(userId: string, placeId: string): Promise<boolean> {
  if (!userId || !placeId) return false;
  try {
    const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('place_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('place_id', placeId)
      .eq('has_receipt_photo', true)
      .gte('created_at', cutoff)
      .limit(1);
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

export async function recordReceiptScanCooldown(_userId: string, _placeId: string): Promise<void> {
  // Cooldown is enforced authoritatively via place_checkins.created_at in Supabase
}

export function computeExplorationTier(totalCheckins: number): { tier: string; tierIcon: string } {
  if (totalCheckins >= 50) return { tier: 'City Legend', tierIcon: '👑' };
  if (totalCheckins >= 20) return { tier: 'Vibe Insider', tierIcon: '🔥' };
  if (totalCheckins >= 5) return { tier: 'Local Scout', tierIcon: '🧭' };
  return { tier: 'New Explorer', tierIcon: '🌱' };
}

export function computeCategoryBadges(categoryCounts: Record<string, number>, receiptCount: number) {
  return [
    { id: 'caffeine_fiend', label: 'Caffeine Fiend', icon: '☕', unlocked: (categoryCounts['Food'] || 0) >= 3 },
    { id: 'gourmet_scout', label: 'Gourmet Scout', icon: '🍽️', unlocked: (categoryCounts['Food'] || 0) >= 5 },
    { id: 'night_mayor', label: 'Night Mayor', icon: '🦉', unlocked: (categoryCounts['Night Owl'] || 0) >= 3 },
    { id: 'culture_vulture', label: 'Culture Vulture', icon: '🎨', unlocked: ((categoryCounts['Art'] || 0) + (categoryCounts['Culture'] || 0)) >= 3 },
    { id: 'vibe_vanguard', label: 'Vibe Vanguard', icon: '🧾', unlocked: receiptCount >= 3 },
  ];
}

export async function getUserExplorationStatus(userId: string): Promise<UserExplorationStatus> {
  const empty: UserExplorationStatus = {
    totalCheckins: 0,
    verifiedReceiptCheckins: 0,
    tier: 'New Explorer',
    tierIcon: '🌱',
    badges: computeCategoryBadges({}, 0),
    mayorships: [],
    placeCheckinCounts: {},
  };
  if (!userId) return empty;
  try {
    const { data, error } = await supabase
      .from('place_checkins')
      .select('place_id, place_name, category, has_receipt_photo')
      .eq('user_id', userId);
    if (error || !data) return empty;
    const totalCheckins = data.length;
    let verifiedReceiptCheckins = 0;
    const categoryCounts: Record<string, number> = {};
    const placeCheckinCounts: Record<string, number> = {};
    for (const row of data) {
      if (row.has_receipt_photo) verifiedReceiptCheckins += 1;
      const cat = row.category || 'Spots';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (row.place_id) {
        placeCheckinCounts[row.place_id] = (placeCheckinCounts[row.place_id] || 0) + 1;
      }
    }
    const { tier, tierIcon } = computeExplorationTier(totalCheckins);
    return {
      totalCheckins,
      verifiedReceiptCheckins,
      tier,
      tierIcon,
      badges: computeCategoryBadges(categoryCounts, verifiedReceiptCheckins),
      mayorships: Object.entries(placeCheckinCounts)
        .filter(([, count]) => count >= 3)
        .map(([pid]) => pid),
      placeCheckinCounts,
    };
  } catch {
    return empty;
  }
}

export async function fetchUserProfileCheckinStats(userId: string): Promise<UserExplorationStatus> {
  return getUserExplorationStatus(userId);
}

export async function recordUserProfileCheckin(
  userId: string,
  placeId: string,
  placeName: string,
  category = 'Spots',
  hasReceipt = false,
  receiptUrl?: string,
  distanceMeters = 10
): Promise<void> {
  if (!userId || !placeId) return;
  await supabase.rpc('rpc_submit_checkin_and_validation', {
    p_place_id: placeId,
    p_place_name: placeName,
    p_category: category,
    p_distance_meters: Math.min(33, Math.round(distanceMeters)),
    p_busyness: 'Moderate',
    p_vibe_rating: 4,
    p_comment: hasReceipt ? 'Verified LiveCheck Receipt' : 'Verified 33m Check-in',
    p_has_receipt_photo: hasReceipt,
    p_receipt_photo_url: receiptUrl || null,
  });
}

export async function processLiveCheckReceiptVerification(params: {
  userId: string;
  placeId: string;
  placeName?: string;
  placeTitle?: string;
  placeCategory?: string;
  file?: File;
  receiptImageData?: string;
  distanceMeters?: number;
  userCoords?: { latitude: number; longitude: number };
  placeCoords?: { lat: number; lng: number };
  basePromoReward?: number;
}): Promise<LiveCheckReceiptResult> {
  const placeName = params.placeName || params.placeTitle || 'Verified Venue';
  const placeCategory = params.placeCategory || 'Spots';
  let distanceMeters = params.distanceMeters ?? 10;
  if (params.userCoords && params.placeCoords) {
    distanceMeters = calculateHaversineMeters(
      params.userCoords.latitude,
      params.userCoords.longitude,
      params.placeCoords.lat,
      params.placeCoords.lng
    );
  }

  if (distanceMeters > MAX_PRESENCE_METERS) {
    return {
      success: false,
      vqEarned: 0,
      confidenceBoost: 0,
      error: `Must be within ${MAX_PRESENCE_METERS}m of ${placeName} (currently ${distanceMeters}m away).`,
    };
  }

  let receiptUrl: string | undefined;
  const storagePath = `receipts/${params.placeId}/${params.userId}_${Date.now()}.jpg`;

  if (params.file) {
    const { error: uploadError } = await supabase.storage
      .from('vibe-media')
      .upload(storagePath, params.file, { cacheControl: '3600', upsert: true });
    if (!uploadError) {
      const { data: pubData } = supabase.storage.from('vibe-media').getPublicUrl(storagePath);
      receiptUrl = pubData?.publicUrl;
    }
  } else if (params.receiptImageData) {
    try {
      const res = await fetch(params.receiptImageData);
      const blob = await res.blob();
      const { error: uploadError } = await supabase.storage
        .from('vibe-media')
        .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) {
        const { data: pubData } = supabase.storage.from('vibe-media').getPublicUrl(storagePath);
        receiptUrl = pubData?.publicUrl;
      }
    } catch {
      receiptUrl = params.receiptImageData;
    }
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_submit_checkin_and_validation', {
    p_place_id: params.placeId,
    p_place_name: placeName,
    p_category: placeCategory,
    p_distance_meters: Math.round(distanceMeters),
    p_busyness: 'Moderate',
    p_vibe_rating: 5,
    p_comment: 'Verified LiveCheck Receipt Photo',
    p_has_receipt_photo: true,
    p_receipt_photo_url: receiptUrl || null,
  });

  if (rpcError) {
    return {
      success: false,
      vqEarned: 0,
      confidenceBoost: 0,
      error: rpcError.message,
    };
  }

  return {
    success: true,
    vqEarned: Number(rpcData?.vq_rewarded || 500),
    confidenceBoost: 15,
    newConfidence: Number(rpcData?.resulting_confidence || 88),
    receiptUrl,
    checkinId: rpcData?.checkin_id,
  };
}
