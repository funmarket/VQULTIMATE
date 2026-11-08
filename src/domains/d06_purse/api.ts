import { supabase } from '../../lib/supabase';
import { VQTransaction } from './types';

export interface VQTransactionHistory {
  transactions: VQTransaction[];
  error: string | null;
}

type LedgerRow = {
  id: string;
  direction: 'credit' | 'debit';
  amount: number;
  reason_code: string | null;
  notes: string | null;
  created_at: string;
};

const ledgerEnabled = import.meta.env.VITE_D06_LEDGER_READ_ENABLED === 'true';

/**
 * Read-only, verified Auth-identity ledger access. Never filter using
 * untrusted legacy text user_id; the SQL RLS policy must bind rows
 * to the authenticated owner_auth_user_id instead.
 */
export async function fetchUserTransactions(_userId: string): Promise<VQTransactionHistory> {
  if (!ledgerEnabled) {
    return {
      transactions: [],
      error: 'Transaction history is unavailable until owner-scoped ledger security is installed.'
    };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { transactions: [], error: 'Sign in to view your transaction history.' };
  }

  const { data, error } = await supabase.from('vq_ledger')
    .select('id,direction,amount,reason_code,notes,created_at')
    .order('created_at', { ascending: false });

  if (error) return { transactions: [], error: `Unable to load transaction history: ${error.message}` };

  const transactions: VQTransaction[] = ((data || []) as LedgerRow[]).map((entry) => {
    const amount = Math.abs(Number(entry.amount) || 0);
    return {
      id: entry.id,
      user_id: auth.user.id,
      type: entry.direction === 'credit' ? 'earned' : 'spent',
      amount: entry.direction === 'credit' ? amount : -amount,
      description: entry.notes?.trim() || entry.reason_code || 'VQ ledger entry',
      created_at: entry.created_at
    };
  });

  return { transactions, error: null };
}
