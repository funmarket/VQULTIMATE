export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'reward' | 'trail' | 'system';
  created_at: string;
  read: boolean;
}
