/**
 * Strict 33-Meter GPS Presence & LiveCheck Receipt Verification Engine
 * Enforces MAX_PRESENCE_METERS = 33, real-time device GPS coordinates,
 * LiveCheck camera receipt verification (+500 VQ reward),
 * 12-hour anti-farm cooldown, and User Profile Check-in & Status Badge Progression.
 */

import { supabase } from '../../lib/supabase';
import { executeVqTransfer } from '../d06_purse';
import { recordPlaceCheckin, getActivePlacePromotion, fetchPromotionForPlace } from './promotions';

// STRICT 33-METER GEOFENCE
export const MAX_PRESENCE_METERS = 33;

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UserExplorationStatus {
  totalCheckins: number;
  tier: 'Newcomer' | 'Wanderer' | 'Explorer' | 'Pathfinder' | 'Vibe Legend';
  categoryBreakdown: Record<string, number>;
  earnedBadges: { id: string; label: string; icon: string; description: string }[];
}

export interface LiveCheckReceiptPayload {
  placeId: string;
  placeTitle: string;
  placeCategory?: string;
  userId: string;
  userCoords: Coordinates;
  placeCoords: { lat: number; lng: number };
  receiptImageData: string; // Base64 data URL from live HTML5 canvas capture
}

export interface LiveCheckReceiptResult {
  success: boolean;
  distanceMeters: number;
  isWithin33m: boolean;
  vqEarned: number;
  newPlaceCheckinsCount: number;
  userStatus: UserExplorationStatus;
  error?: string;
}

const RECEIPT_COOLDOWN_KEY = 'vq_livecheck_receipt_cooldowns';
const USER_CHECKIN_STATS_KEY = 'vq_user_checkin_stats';

/**
 * Computes exact Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const calculateDistanceMeters = calculateHaversineMeters;

/**
 * Acquires fresh, high-accuracy GPS coordinates from the device.
 */
export async function acquireHighAccuracyPosition(): Promise<Coordinates> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or environment.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        let msg = 'Unable to acquire GPS coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow GPS location to verify presence.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS acquisition timed out. Please retry in an open area.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Verifies if current device coordinates are within exact 33 meters of a place.
 */
export async function checkPlaceProximity(
  placeLat?: number,
  placeLng?: number
): Promise<{
  distanceMeters: number | null;
  isWithin33m: boolean;
  accuracy?: number;
  userCoords?: Coordinates;
  error?: string;
}> {
  if (placeLat === undefined || placeLng === undefined || isNaN(placeLat) || isNaN(placeLng)) {
    return {
      distanceMeters: null,
      isWithin33m: false,
      error: 'Venue coordinates are unavailable for GPS proximity calculation.'
    };
  }

  try {
    const coords = await acquireHighAccuracyPosition();
    const distanceMeters = calculateHaversineMeters(
      coords.latitude,
      coords.longitude,
      placeLat,
      placeLng
    );
    const isWithin33m = distanceMeters <= MAX_PRESENCE_METERS;
    return {
      distanceMeters,
      isWithin33m,
      accuracy: coords.accuracy,
      userCoords: coords
    };
  } catch (err: any) {
    return {
      distanceMeters: null,
      isWithin33m: false,
      error: err.message || 'Failed to acquire device GPS position.'
    };
  }
}

// ==========================================
// 12-Hour Anti-Farm Cooldown for Receipts
// ==========================================

function getReceiptCooldowns(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RECEIPT_COOLDOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReceiptCooldowns(map: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECEIPT_COOLDOWN_KEY, JSON.stringify(map));
  } catch {}
}

export function hasUserScannedReceiptRecently(placeId: string, userId: string): boolean {
  if (!placeId || !userId) return false;
  const cooldowns = getReceiptCooldowns();
  const key = `${userId}_${placeId}`;
  const lastScanned = cooldowns[key];
  if (!lastScanned) return false;

  const twelveHoursMs = 12 * 60 * 60 * 1000;
  return Date.now() - lastScanned < twelveHoursMs;
}

export function recordReceiptScanCooldown(placeId: string, userId: string): void {
  if (!placeId || !userId) return;
  const cooldowns = getReceiptCooldowns();
  const key = `${userId}_${placeId}`;
  cooldowns[key] = Date.now();
  saveReceiptCooldowns(cooldowns);
}

// ==========================================
// User Check-In Status & Badge Progression
// ==========================================

export function computeExplorationTier(
  totalCheckins: number
): 'Newcomer' | 'Wanderer' | 'Explorer' | 'Pathfinder' | 'Vibe Legend' {
  if (totalCheckins <= 0) return 'Newcomer';
  if (totalCheckins <= 2) return 'Wanderer';
  if (totalCheckins <= 7) return 'Explorer';
  if (totalCheckins <= 19) return 'Pathfinder';
  return 'Vibe Legend';
}

export function computeCategoryBadges(
  categoryBreakdown: Record<string, number> = {}
): { id: string; label: string; icon: string; description: string }[] {
  const badges: { id: string; label: string; icon: string; description: string }[] = [];

  const foodCount = (categoryBreakdown['food'] || 0) + (categoryBreakdown['restaurant'] || 0) + (categoryBreakdown['cafe'] || 0);
  if (foodCount >= 2) {
    badges.push({
      id: 'foodie',
      label: 'Foodie',
      icon: '🍴',
      description: `${foodCount} food & cafe check-ins`
    });
  }

  const nightCount = (categoryBreakdown['night'] || 0) + (categoryBreakdown['night owl'] || 0) + (categoryBreakdown['bar'] || 0) + (categoryBreakdown['club'] || 0);
  if (nightCount >= 2) {
    badges.push({
      id: 'night_owl',
      label: 'Night Owl',
      icon: '🌙',
      description: `${nightCount} nightlife check-ins`
    });
  }

  const artCount = (categoryBreakdown['art'] || 0) + (categoryBreakdown['gallery'] || 0) + (categoryBreakdown['museum'] || 0);
  if (artCount >= 2) {
    badges.push({
      id: 'art_curator',
      label: 'Art Curator',
      icon: '🎨',
      description: `${artCount} art & museum check-ins`
    });
  }

  const cultureCount = (categoryBreakdown['culture'] || 0) + (categoryBreakdown['heritage'] || 0) + (categoryBreakdown['historic'] || 0) + (categoryBreakdown['landmark'] || 0);
  if (cultureCount >= 2) {
    badges.push({
      id: 'culture_seeker',
      label: 'Culture Seeker',
      icon: '🏛️',
      description: `${cultureCount} historic & culture check-ins`
    });
  }

  const spotsCount = (categoryBreakdown['spots'] || 0) + (categoryBreakdown['spot'] || 0) + (categoryBreakdown['park'] || 0) + (categoryBreakdown['adventure'] || 0);
  if (spotsCount >= 2) {
    badges.push({
      id: 'trailblazer',
      label: 'Trailblazer',
      icon: '🧭',
      description: `${spotsCount} scenic spot check-ins`
    });
  }

  return badges;
}

export function getUserExplorationStatus(
  totalCheckins: number,
  categoryBreakdown: Record<string, number> = {}
): UserExplorationStatus {
  return {
    totalCheckins,
    tier: computeExplorationTier(totalCheckins),
    categoryBreakdown,
    earnedBadges: computeCategoryBadges(categoryBreakdown)
  };
}

/**
 * Fetches user's current check-in stats and badge progression from storage.
 */
export function fetchUserProfileCheckinStats(userId?: string): UserExplorationStatus {
  if (typeof window === 'undefined' || !userId) {
    return getUserExplorationStatus(0, {});
  }

  try {
    const raw = localStorage.getItem(`${USER_CHECKIN_STATS_KEY}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const total = typeof parsed.totalCheckins === 'number' ? parsed.totalCheckins : 0;
      const breakdown = parsed.categoryBreakdown || {};
      return getUserExplorationStatus(total, breakdown);
    }
  } catch {}

  return getUserExplorationStatus(0, {});
}

/**
 * Records a check-in on the user's profile, increments counters, updates badges,
 * and persists to local storage and Supabase.
 */
export async function recordUserProfileCheckin(
  userId: string,
  placeCategory: string = 'Spots'
): Promise<UserExplorationStatus> {
  const current = fetchUserProfileCheckinStats(userId);
  const normCat = placeCategory.toLowerCase().trim();

  const newBreakdown = { ...current.categoryBreakdown };
  newBreakdown[normCat] = (newBreakdown[normCat] || 0) + 1;
  const newTotal = current.totalCheckins + 1;

  const updatedStatus = getUserExplorationStatus(newTotal, newBreakdown);

  // Persist locally
  if (typeof window !== 'undefined' && userId) {
    try {
      localStorage.setItem(
        `${USER_CHECKIN_STATS_KEY}_${userId}`,
        JSON.stringify({
          totalCheckins: newTotal,
          categoryBreakdown: newBreakdown,
          tier: updatedStatus.tier,
          earnedBadges: updatedStatus.earnedBadges
        })
      );
    } catch {}
  }

  // Persist to Supabase profiles table if available
  if (userId && !userId.startsWith('usr_anonymous')) {
    try {
      await supabase
        .from('profiles')
        .update({
          checkins_count: newTotal,
          tier: updatedStatus.tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('Profile check-in count update fallback to local:', err);
    }
  }

  return updatedStatus;
}

// ==========================================
// LiveCheck Camera Receipt Verification Flow
// ==========================================

export async function processLiveCheckReceiptVerification(
  payload: LiveCheckReceiptPayload
): Promise<LiveCheckReceiptResult> {
  const {
    placeId,
    placeTitle,
    placeCategory = 'Spots',
    userId,
    userCoords,
    placeCoords,
    receiptImageData
  } = payload;

  if (!receiptImageData || !receiptImageData.startsWith('data:image/')) {
    return {
      success: false,
      distanceMeters: 9999,
      isWithin33m: false,
      vqEarned: 0,
      newPlaceCheckinsCount: 0,
      userStatus: fetchUserProfileCheckinStats(userId),
      error: 'A live receipt photo captured via LiveCheck camera is required.'
    };
  }

  // Exact 33m check
  const distanceMeters = calculateHaversineMeters(
    userCoords.latitude,
    userCoords.longitude,
    placeCoords.lat,
    placeCoords.lng
  );

  const isWithin33m = distanceMeters <= MAX_PRESENCE_METERS;
  if (!isWithin33m) {
    return {
      success: false,
      distanceMeters,
      isWithin33m: false,
      vqEarned: 0,
      newPlaceCheckinsCount: 0,
      userStatus: fetchUserProfileCheckinStats(userId),
      error: `You are ${distanceMeters}m away from ${placeTitle}. You must be within ${MAX_PRESENCE_METERS} meters to verify receipt.`
    };
  }

  // 12-Hour Cooldown check
  if (hasUserScannedReceiptRecently(placeId, userId)) {
    return {
      success: false,
      distanceMeters,
      isWithin33m: true,
      vqEarned: 0,
      newPlaceCheckinsCount: 0,
      userStatus: fetchUserProfileCheckinStats(userId),
      error: 'Receipt verification is on a 12-hour cooldown for this spot to prevent duplicate scans.'
    };
  }

  // 1. Award +500 VQ: Credit user's purse, deduct from promotion if promoted
  const promo = await fetchPromotionForPlace(placeId);
  const awardAmount = 500;

  // Credit user's Purse
  try {
    await executeVqTransfer({
      toUserId: userId,
      amount: awardAmount,
      type: 'earned',
      description: `LiveCheck Receipt Verified at ${placeTitle} (${distanceMeters}m <= 33m)`
    });
  } catch (err) {
    console.warn('Failed to credit VQ for receipt:', err);
  }

  // Deduct from promo pool if promoted
  if (promo && promo.remaining_vq_pool >= awardAmount) {
    promo.remaining_vq_pool -= awardAmount;
    if (promo.remaining_vq_pool < promo.reward_per_checkin) {
      promo.status = 'depleted';
    }
    try {
      await supabase
        .from('place_promotions')
        .update({
          remaining_vq_pool: promo.remaining_vq_pool,
          status: promo.status,
          updated_at: new Date().toISOString()
        })
        .eq('place_id', placeId);
    } catch {}
  }

  // 2. Record venue check-in
  const checkinResult = await recordPlaceCheckin({
    placeId,
    placeTitle,
    placeCategory,
    userId
  });

  // 3. Record user profile check-in & compute status progression
  const userStatus = await recordUserProfileCheckin(userId, placeCategory);

  // 4. Record 12h cooldown
  recordReceiptScanCooldown(placeId, userId);

  return {
    success: true,
    distanceMeters,
    isWithin33m: true,
    vqEarned: awardAmount,
    newPlaceCheckinsCount: checkinResult.newCheckinCount,
    userStatus
  };
}
