export interface GuardianReview {
  id: string;
  guardian_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  rating: number; // 1 to 5
  comment: string; // Max 111 chars per reference UI
  created_at: string;
}
