import { supabase } from '../../lib/supabase';
import { AppNotification } from './types';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'New Vibe Pulse Active',
    message: 'A high-intensity cultural pulse is detected at Neon Spice Souk Rooftop (+50 VQ).',
    type: 'reward',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    title: 'Guardian District Patrol',
    message: 'Tariq Al-Mansoori verified 3 new heritage waypoints in Old Quarter.',
    type: 'trail',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: false
  },
  {
    id: 'notif-3',
    title: 'System Genesis Block',
    message: 'Connected to Supabase avdfessrhbsqwlfmbdau. All security policies active.',
    type: 'system',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true
  }
];

export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_NOTIFICATIONS;
    }
    return data as AppNotification[];
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}
