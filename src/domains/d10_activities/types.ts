export interface FlashEvent {
  id: string;
  title: string;
  description?: string;
  place_id?: string;
  secret_id?: string;
  ends_at: string;
  seconds_left: number;
  kind: 'secret_party' | 'after_hours' | 'private_game' | 'happy_hour' | 'limited_promo' | 'other';
  location?: string;
  vq_reward?: number;
  active?: boolean;
}

export interface ActivityFeedItem {
  id: string;
  user_name: string;
  action: string;
  target: string;
  time_ago: string;
  vq_earned: number;
}
