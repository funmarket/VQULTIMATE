import { supabase } from '../../lib/supabase';
import { AppNotification } from './types';

export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }
    return data as AppNotification[];
  } catch (err) {
    console.warn('Error querying notifications from Supabase:', err);
    return [];
  }
}
