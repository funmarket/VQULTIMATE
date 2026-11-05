import { supabase } from '../../lib/supabase';
import { FlashEvent, ActivityFeedItem } from './types';

export async function fetchFlashEvent(): Promise<FlashEvent | null> {
  try {
    const { data, error } = await supabase
      .from('flash_events')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as FlashEvent;
  } catch (err) {
    console.warn('Error querying flash_events:', err);
    return null;
  }
}

export async function fetchActivities(): Promise<ActivityFeedItem[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return [];
    }
    return data as ActivityFeedItem[];
  } catch (err) {
    console.warn('Error querying activities:', err);
    return [];
  }
}
