export interface FollowRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface SocialFollowResult {
  success: boolean;
  following: boolean;
  error?: string;
}
