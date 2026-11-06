/** Public D12 social-content contracts. Database rows remain authoritative. */
export interface SocialPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  caption: string;
  image_url: string;
  selfie_url?: string;
  composite_url?: string;
  created_at: string;
  reactions_count: number;
  comments_count: number;
  user_reacted?: boolean;
}

export interface SocialComment {
  id: string;
  post_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
}

export interface SocialWriteResult<T> {
  success: boolean;
  error?: string;
  post?: T;
}
