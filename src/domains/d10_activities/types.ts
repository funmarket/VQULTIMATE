export interface FlashEvent {
  id: string;
  title: string;
  location: string;
  vq_reward: number;
  duration_mins: number;
  active: boolean;
}

export interface ActivityFeedItem {
  id: string;
  user_name: string;
  action: string;
  target: string;
  time_ago: string;
  vq_earned: number;
}
