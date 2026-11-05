import { supabase } from '../../lib/supabase';
import { VQTransaction } from './types';

export async function fetchUserTransactions(userId: string): Promise<VQTransaction[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('vq_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }
    return data as VQTransaction[];
  } catch (err) {
    console.warn('Error fetching transactions from Supabase:', err);
    return [];
  }
}
