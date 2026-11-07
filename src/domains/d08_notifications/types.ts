export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'reward' | 'trail' | 'system' | 'match' | 'dm';
  created_at: string;
  read: boolean;
  action_label?: string;
  action_url?: string;
}
