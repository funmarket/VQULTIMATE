import { VQTransaction } from './types';

export interface VQTransactionHistory {
  transactions: VQTransaction[];
  error: string | null;
}

/**
 * D06 Purse read gate.
 * The former vq_transactions relation does not exist. The actual vq_ledger
 * contains legacy text user IDs, different ledger fields, and currently has
 * an unrestricted public RLS policy. Do not query it from an untrusted client
 * or treat a failed read as an empty history.
 *
 * Re-enable this method only after the ledger domain owner approves a
 * user-scoped read API, canonical identity mapping and RLS verification.
 */
export async function fetchUserTransactions(_userId: string): Promise<VQTransactionHistory> {
  return {
    transactions: [],
    error: 'Transaction history is temporarily unavailable pending a verified, account-scoped VQ Ledger API. No balance or transactions were changed.'
  };
}
