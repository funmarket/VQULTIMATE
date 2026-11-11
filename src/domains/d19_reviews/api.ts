import { supabase } from '@/lib/supabase';
import { GuardianReview } from './types';
import { hasCompletedHandshake } from '../d22_handshake';

const LOCAL_REVIEWS_KEY = 'vq_guardian_reviews_store';

function getLocalReviews(): GuardianReview[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReviews(reviews: GuardianReview[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
    }
  } catch {}
}

export async function fetchGuardianReviews(guardianId: string): Promise<GuardianReview[]> {
  if (!guardianId) return [];

  let remoteReviews: GuardianReview[] = [];
  try {
    const { data, error } = await supabase
      .from('guardian_reviews')
      .select('*')
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteReviews = (data as any[]).map(row => ({
        id: row.id,
        guardian_id: row.guardian_id,
        reviewer_id: row.user_id || row.reviewer_id,
        reviewer_name: row.user_name || row.reviewer_name || 'Explorer',
        reviewer_avatar: row.user_avatar_url || row.reviewer_avatar,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at
      }));
    }
  } catch {}

  const localList = getLocalReviews().filter(r => r.guardian_id === guardianId);
  const map = new Map<string, GuardianReview>();
  [...remoteReviews, ...localList].forEach(r => {
    if (!map.has(r.id)) map.set(r.id, r);
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export async function submitGuardianReview(input: {
  guardianId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; review?: GuardianReview; error?: string }> {
  if (!input.reviewerId) return { success: false, error: 'Sign in before submitting a review.' };
  if (!input.guardianId) return { success: false, error: 'Target Guardian is required.' };
  if (input.reviewerId === input.guardianId) {
    return { success: false, error: 'Guardians cannot review themselves.' };
  }

  const trimmed = input.comment.trim();
  if (!trimmed) return { success: false, error: 'Review text cannot be empty.' };
  if (trimmed.length > 111) {
    return { success: false, error: 'Review cannot exceed 111 characters.' };
  }

  // Handshake gating check per reference specification
  const isEligible = await hasCompletedHandshake(input.reviewerId, input.guardianId);
  if (!isEligible) {
    return { success: false, error: 'Handshake required before reviews can be posted.' };
  }

  const newReview: GuardianReview = {
    id: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    guardian_id: input.guardianId,
    reviewer_id: input.reviewerId,
    reviewer_name: input.reviewerName || 'Explorer',
    reviewer_avatar: input.reviewerAvatar,
    rating: Math.max(1, Math.min(5, Math.round(input.rating || 5))),
    comment: trimmed,
    created_at: new Date().toISOString()
  };

  const localList = getLocalReviews();
  localList.unshift(newReview);
  saveLocalReviews(localList);

  try {
    const { data, error } = await supabase
      .from('guardian_reviews')
      .insert([{
        id: newReview.id,
        guardian_id: newReview.guardian_id,
        user_id: newReview.reviewer_id,
        user_name: newReview.reviewer_name,
        user_avatar_url: newReview.reviewer_avatar,
        rating: newReview.rating,
        comment: newReview.comment,
        created_at: newReview.created_at
      }])
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase guardian_reviews insert notice:', error?.message);
      return { success: true, review: newReview };
    }
    return { success: true, review: newReview };
  } catch {
    return { success: true, review: newReview };
  }
}
