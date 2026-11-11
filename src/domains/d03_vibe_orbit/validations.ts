/**
 * Waze-Style Community Vibe Validation Domain API
 * Server-authoritative Supabase implementation via place_validations and rpc_submit_checkin_and_validation.
 */

import { supabase } from '@/lib/supabase';

export type ValidationResponse = 'yes' | 'no' | 'abstain';

export interface PlaceValidation {
  id: string;
  place_id: string;
  user_id: string;
  response: ValidationResponse;
  confidence_score: number;
  confidence_change: number;
  vibe_tags: string[];
  comment?: string;
  reward_pts: number;
  created_at: string;
}

export interface PlaceValidationSummary {
  averageConfidence: number | null;
  count: number;
  validations: PlaceValidation[];
  baselineConfidence: number;
}

export interface ProximityValidationPayload {
  placeId: string;
  placeTitle: string;
  placeRating?: number;
  placeCategory?: string;
  placeLat?: number;
  placeLng?: number;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userLat?: number;
  userLng?: number;
  response: ValidationResponse;
  userStreak?: number;
  vibeTags?: string[];
  changeTags?: string[];
  comment?: string;
  receiptPhotoUrl?: string;
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

export function getUserValidationStreak(_userId?: string): number {
  return 1;
}

export function saveUserValidationStreak(_userId: string, _streak: number): void {
  // Handled server-side
}

export function calculateValidationRewards(streak: number = 1): {
  multiplier: number;
  yesReward: number;
  noReward: number;
} {
  const boundedStreak = Math.max(1, streak);
  const multiplier = boundedStreak <= 1 ? 1 : Math.min(2, 1 + 0.1 * boundedStreak);
  return { multiplier, yesReward: 0, noReward: 0 };
}

export function hasUserValidatedToday(_placeId: string, _userId: string): boolean {
  return false;
}

/**
 * Fetches real validations for a place from Supabase and returns the latest cumulative resulting_confidence.
 */
export async function fetchPlaceValidations(
  placeId: string,
  placeRating?: number
): Promise<PlaceValidationSummary> {
  const baselineConfidence = Math.round((placeRating ?? 4.0) * 20);

  if (!placeId) {
    return { averageConfidence: null, count: 0, validations: [], baselineConfidence };
  }

  const { data, error } = await supabase
    .from('place_validations')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data) || data.length === 0) {
    return {
      averageConfidence: null,
      count: 0,
      validations: [],
      baselineConfidence
    };
  }

  const validations: PlaceValidation[] = data.map((row: any) => {
    const resp: ValidationResponse =
      row.response === 'no' || (row.comment && row.comment.includes('NEGATIVE_VALIDATION'))
        ? 'no'
        : row.response === 'abstain'
        ? 'abstain'
        : 'yes';
    const score = Number(row.resulting_confidence ?? row.confidence_score ?? baselineConfidence);
    const delta = Number(row.confidence_delta ?? (resp === 'yes' ? 15 : resp === 'no' ? -25 : 0));

    return {
      id: String(row.id),
      place_id: String(row.place_id),
      user_id: String(row.user_id),
      response: resp,
      confidence_score: score,
      confidence_change: delta,
      vibe_tags: Array.isArray(row.vibe_tags) ? row.vibe_tags : [],
      comment: row.comment || undefined,
      reward_pts: Number(row.vq_awarded || 0),
      created_at: row.created_at || new Date().toISOString()
    };
  });

  const validRows = validations.filter((v) => v.response !== 'abstain');
  if (validRows.length === 0) {
    return {
      averageConfidence: null,
      count: 0,
      validations: [],
      baselineConfidence
    };
  }

  // Latest row is first because of ORDER BY created_at DESC
  const latestConfidence = validRows[0].confidence_score;

  return {
    averageConfidence: latestConfidence,
    count: validRows.length,
    validations: validRows,
    baselineConfidence
  };
}

export const fetchValidationsForPlace = fetchPlaceValidations;

/**
 * Submits ProximityValidator response via rpc_submit_checkin_and_validation.
 */
export async function submitProximityValidation(
  payload: ProximityValidationPayload
): Promise<ProximityValidationResult> {
  const {
    placeId,
    placeTitle,
    placeRating = 4.0,
    placeCategory = 'Spots',
    placeLat = 36.8065,
    placeLng = 10.1815,
    userId,
    userName = 'Explorer',
    userAvatar,
    userLat,
    userLng,
    response,
    userStreak = 1,
    vibeTags = [],
    changeTags = [],
    comment,
    receiptPhotoUrl
  } = payload;

  const currentSummary = await fetchPlaceValidations(placeId, placeRating);
  const baselineConfidence = Math.round((placeRating ?? 4.0) * 20);

  if (response === 'abstain') {
    return {
      success: true,
      response: 'abstain',
      confidenceChange: 0,
      newConfidence: currentSummary.averageConfidence,
      newConfirmationsCount: currentSummary.count,
      rewardPoints: 0,
      streak: userStreak
    };
  }

  const effectiveUserLat = userLat ?? placeLat;
  const effectiveUserLng = userLng ?? placeLng;

  const { data, error } = await supabase.rpc('rpc_submit_checkin_and_validation', {
    p_place_id: placeId,
    p_place_title: placeTitle,
    p_place_category: placeCategory,
    p_place_lat: placeLat,
    p_place_lng: placeLng,
    p_user_id: userId,
    p_user_name: userName,
    p_user_avatar: userAvatar || null,
    p_user_lat: effectiveUserLat,
    p_user_lng: effectiveUserLng,
    p_response: response,
    p_vibe_tags: vibeTags,
    p_change_tags: changeTags,
    p_comment: comment?.trim() || null,
    p_receipt_photo_url: receiptPhotoUrl || null,
    p_baseline_confidence: baselineConfidence
  });

  if (error) {
    return {
      success: false,
      response,
      confidenceChange: 0,
      newConfidence: currentSummary.averageConfidence,
      newConfirmationsCount: currentSummary.count,
      rewardPoints: 0,
      streak: userStreak,
      error: error.message
    };
  }

  if (!data || !data.success) {
    return {
      success: false,
      response,
      confidenceChange: 0,
      newConfidence: currentSummary.averageConfidence,
      newConfirmationsCount: currentSummary.count,
      rewardPoints: 0,
      streak: userStreak,
      error: data?.error || 'Validation failed.'
    };
  }

  const newConfidence = Number(data.new_confidence ?? baselineConfidence);
  const confidenceChange = Number(data.confidence_delta ?? (response === 'yes' ? 15 : -25));
  const rewardPoints = Number(data.vq_earned ?? 0);
  const newCount = Number(data.confirmations_count ?? currentSummary.count + 1);

  return {
    success: true,
    response,
    confidenceChange,
    newConfidence,
    newConfirmationsCount: newCount,
    rewardPoints,
    streak: response === 'yes' ? userStreak + 1 : userStreak
  };
}

/**
 * Legacy compatibility wrapper for submitPlaceValidation.
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
