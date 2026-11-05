export interface VibeComment {
  id: string;
  post_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

export interface VibePostItem {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  caption: string;
  image_url: string;
  selfie_url?: string;
  composite_url?: string;
  lat?: number;
  lng?: number;
  place_id?: string;
  created_at: string;
  reactions_count: number;
  comments_count: number;
  user_reacted?: boolean;
}
