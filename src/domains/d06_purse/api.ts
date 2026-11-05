import { supabase } from '../../lib/supabase';
import { VQTransaction } from './types';

export async function fetchUserTransactions(userId: string): Promise<VQTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('vq_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      const localTxs = JSON.parse(localStorage.getItem('vq_local_txs') || '[]');
      return localTxs;
    }
    return data as VQTransaction[];
  } catch (err) {
    console.warn('Error fetching transactions from Supabase:', err);
    const localTxs = JSON.parse(localStorage.getItem('vq_local_txs') || '[]');
    return localTxs;
  }
}
