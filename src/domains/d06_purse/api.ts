import { supabase } from '../../lib/supabase';
import { VQTransaction } from './types';

export const INITIAL_TRANSACTIONS: VQTransaction[] = [
  {
    id: 'tx-1',
    user_id: 'usr_guardian_01',
    type: 'earned',
    amount: 150,
    description: 'Verified Vibe Orbit waypoint at Souk Rooftop',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'tx-2',
    user_id: 'usr_guardian_01',
    type: 'reward',
    amount: 500,
    description: 'Weekly Guardian District Patrol Bonus',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'tx-3',
    user_id: 'usr_guardian_01',
    type: 'staked',
    amount: -200,
    description: 'Staked in Trail Pathfinder Pool #4',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

export async function fetchUserTransactions(userId: string): Promise<VQTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('vq_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_TRANSACTIONS;
    }
    return data as VQTransaction[];
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}
