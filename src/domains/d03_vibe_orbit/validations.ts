/**
 * Waze-Style Community Vibe Validation Domain API
 * Manages crowd-sourced real-time spot validations, calculating genuine average confidence %
 * and collecting live situation updates using the signature ProximityValidator mechanics.
 */

import { supabase } from '../../lib/supabase';
import { executeVqTransfer } from '../d06_purse';

export type ValidationResponse = 'yes' | 'no' | 'abstain';

export interface PlaceValidation {
  id: string;
  place_id: string;
  user_id: string;
  response: ValidationResponse;
  confidence_score: number; // 10 to 100
  confidence_change: number; // +15, -25, or 0
  vibe_tags: string[];
  comment?: string;
  reward_pts: number;
  created_at: string;
}

export interface PlaceValidationSummary {
  averageConfidence: number | null; // null when 0 validations exist (strictly 'Unrated (0 confirmations)')
  count: number;
  validations: PlaceValidation[];
  baselineConfidence: number; // Initial derived from Google rating: round((rating ?? 4.0) * 20)
}

export interface ProximityValidationPayload {
  placeId: string;
  placeTitle: string;
  placeRating?: number;
  userId: string;
  response: ValidationResponse;
  userStreak?: number;
  vibeTags?: string[];
  changeTags?: string[];
  comment?: string;
}

export interface ProximityValidationResult {
  success: boolean;
  response: ValidationResponse;
  confidenceChange: number;
  newConfidence: number | null;
  newConfirmationsCount: number;
  rewardPoints: number;
  streak: number;
  validation?: PlaceValidation;
  error?: string;
}

const VALIDATIONS_CACHE_KEY = 'vq_place_validations_cache';
const USER_STREAK_KEY = 'vq_user_validation_streak';

function getLocalValidations(): PlaceValidation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VALIDATIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalValidations(list: PlaceValidation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VALIDATIONS_CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save validations to local cache:', err);
  }
}

export function getUserValidationStreak(userId?: string): number {
  if (typeof window === 'undefined' || !userId) return 1;
  try {
    const raw = localStorage.getItem(`${USER_STREAK_KEY}_${userId}`);
    const num = raw ? parseInt(raw, 10) : 1;
    return isNaN(num) || num < 1 ? 1 : num;
  } catch {
    return 1;
  }
}

export function saveUserValidationStreak(userId: string, streak: number): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${USER_STREAK_KEY}_${userId}`, String(Math.max(1, streak)));
  } catch {}
}

export function calculateValidationRewards(streak: number = 1): {
  multiplier: number;
  yesReward: number;
  noReward: number;
} {
  const boundedStreak = Math.max(1, streak);
  const multiplier = boundedStreak <= 1 ? 1 : Math.min(2, 1 + 0.1 * boundedStreak);
  const yesReward = Math.round(15 * multiplier);
  const noReward = 10;
  return { multiplier, yesReward, noReward };
}

export function hasUserValidatedToday(placeId: string, userId: string): boolean {
  if (!placeId || !userId) return false;
  const validations = getLocalValidations().filter(v => v.place_id === placeId && v.user_id === userId);
  if (validations.length === 0) return false;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return validations.some(v => now - new Date(v.created_at).getTime() < dayMs);
}

/**
 * Fetches real validations for a place and calculates true average confidence percentage.
 */
export async function fetchPlaceValidations(
  placeId: string,
  placeRating?: number
): Promise<PlaceValidationSummary> {
  const baselineConfidence = Math.round((placeRating ?? 4.0) * 20);
  const localList = getLocalValidations().filter(v => v.place_id === placeId);

  try {
    const { data, error } = await supabase
      .from('place_validations')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const dbList: PlaceValidation[] = data.map((row: any) => ({
        id: String(row.id),
        place_id: String(row.place_id),
        user_id: String(row.user_id),
        response: (row.comment && row.comment.includes('NEGATIVE_VALIDATION')) ? 'no' : 'yes',
        confidence_score: Number(row.confidence_score),
        confidence_change: Number(row.confidence_score) >= baselineConfidence ? 15 : -25,
        vibe_tags: Array.isArray(row.vibe_tags) ? row.vibe_tags : [],
        comment: row.comment || undefined,
        reward_pts: 15,
        created_at: row.created_at || new Date().toISOString()
      }));

      // Merge unique by ID
      const map = new Map<string, PlaceValidation>();
      [...dbList, ...localList].forEach(v => map.set(v.id, v));
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // If no valid user submissions exist yet, return null average
      const realSubmissions = merged.filter(v => v.response !== 'abstain');
      if (realSubmissions.length === 0) {
        return {
          averageConfidence: null,
          count: 0,
          validations: [],
          baselineConfidence
        };
      }

      // Calculate confidence starting from baseline
      let runningScore = baselineConfidence;
      realSubmissions.forEach(v => {
        if (v.response === 'yes') {
          runningScore = Math.min(100, Math.max(10, runningScore + 15));
        } else if (v.response === 'no') {
          runningScore = Math.min(100, Math.max(10, runningScore - 25));
        }
      });

      return {
        averageConfidence: runningScore,
        count: realSubmissions.length,
        validations: merged,
        baselineConfidence
      };
    }
  } catch (err) {
    console.warn('Error fetching validations from Supabase, using local cache:', err);
  }

  const realSubmissions = localList.filter(v => v.response !== 'abstain');
  if (realSubmissions.length === 0) {
    return {
      averageConfidence: null,
      count: 0,
      validations: [],
      baselineConfidence
    };
  }

  let runningScore = baselineConfidence;
  realSubmissions.forEach(v => {
    if (v.response === 'yes') {
      runningScore = Math.min(100, Math.max(10, runningScore + 15));
    } else if (v.response === 'no') {
      runningScore = Math.min(100, Math.max(10, runningScore - 25));
    }
  });

  return {
    averageConfidence: runningScore,
    count: realSubmissions.length,
    validations: localList,
    baselineConfidence
  };
}

/**
 * Submits authentic ProximityValidator ("ARE YOU HERE RIGHT NOW?") response.
 */
export async function submitProximityValidation(
  payload: ProximityValidationPayload
): Promise<ProximityValidationResult> {
  const {
    placeId,
    placeTitle,
    placeRating = 4.0,
    userId,
    response,
    userStreak = 1,
    vibeTags = [],
    changeTags = [],
    comment
  } = payload;

  const currentSummary = await fetchPlaceValidations(placeId, placeRating);
  const baselineConfidence = Math.round((placeRating ?? 4.0) * 20);
  const currentConfidence = currentSummary.averageConfidence ?? baselineConfidence;
  const currentCount = currentSummary.count;

  // 1. Abstain: No points, no confidence change, no confirmations increment
  if (response === 'abstain') {
    return {
      success: true,
      response: 'abstain',
      confidenceChange: 0,
      newConfidence: currentSummary.averageConfidence,
      newConfirmationsCount: currentCount,
      rewardPoints: 0,
      streak: userStreak
    };
  }

  // 2. Anti-spam check: prevent duplicate submissions within 24h by same user
  if (hasUserValidatedToday(placeId, userId)) {
    return {
      success: false,
      response,
      confidenceChange: 0,
      newConfidence: currentSummary.averageConfidence,
      newConfirmationsCount: currentCount,
      rewardPoints: 0,
      streak: userStreak,
      error: 'You have already verified this spot today. Thanks for contributing!'
    };
  }

  // 3. Compute adjustments & rewards
  const { yesReward, noReward } = calculateValidationRewards(userStreak);
  let confidenceChange = 0;
  let rewardPoints = 0;
  let newConfidence = currentConfidence;

  if (response === 'yes') {
    confidenceChange = 15;
    rewardPoints = yesReward;
    newConfidence = Math.min(100, Math.max(10, currentConfidence + 15));
  } else if (response === 'no') {
    confidenceChange = -25;
    rewardPoints = noReward;
    newConfidence = Math.min(100, Math.max(10, currentConfidence - 25));
  }

  const allTags = [...vibeTags, ...changeTags];
  const validationId = `val-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newValidation: PlaceValidation = {
    id: validationId,
    place_id: placeId,
    user_id: userId,
    response,
    confidence_score: newConfidence,
    confidence_change: confidenceChange,
    vibe_tags: allTags,
    comment: comment?.trim() || (response === 'no' ? 'NEGATIVE_VALIDATION: Something changed' : undefined),
    reward_pts: rewardPoints,
    created_at: new Date().toISOString()
  };

  // Await persistence in local storage
  const allValidations = getLocalValidations();
  allValidations.unshift(newValidation);
  saveLocalValidations(allValidations);

  // Update streak
  const newStreak = response === 'yes' ? userStreak + 1 : userStreak;
  saveUserValidationStreak(userId, newStreak);

  // Credit user's Purse with real VQ reward points
  if (rewardPoints > 0 && userId && !userId.startsWith('usr_anonymous')) {
    try {
      await executeVqTransfer({
        toUserId: userId,
        amount: rewardPoints,
        type: 'earned',
        description: `Vibe validation reward for ${placeTitle} (${response === 'yes' ? '+15% Match' : 'Situation Report'})`
      });
    } catch (err) {
      console.warn('Purse credit transfer fallback:', err);
    }
  }

  // Await Supabase insertion
  try {
    await supabase.from('place_validations').insert([{
      place_id: placeId,
      user_id: userId,
      confidence_score: newConfidence,
      vibe_tags: allTags,
      comment: newValidation.comment || null
    }]);
  } catch (err) {
    console.warn('Supabase validation insert fallback to local:', err);
  }

  return {
    success: true,
    response,
    confidenceChange,
    newConfidence,
    newConfirmationsCount: currentCount + 1,
    rewardPoints,
    streak: newStreak,
    validation: newValidation
  };
}

/**
 * Legacy compatibility wrapper for submitPlaceValidation
 */
export async function submitPlaceValidation(payload: {
  placeId: string;
  userId: string;
  confidenceScore: number;
  vibeTags: string[];
  comment?: string;
}): Promise<{
  success: boolean;
  newAverage: number;
  newCount: number;
  validation?: PlaceValidation;
  error?: string;
}> {
  const res = await submitProximityValidation({
    placeId: payload.placeId,
    placeTitle: 'Spot',
    userId: payload.userId,
    response: payload.confidenceScore >= 50 ? 'yes' : 'no',
    vibeTags: payload.vibeTags,
    comment: payload.comment
  });

  return {
    success: res.success,
    newAverage: res.newConfidence ?? 85,
    newCount: res.newConfirmationsCount,
    validation: res.validation,
    error: res.error
  };
}
