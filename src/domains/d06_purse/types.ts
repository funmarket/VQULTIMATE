export interface VqAccount {
  user_id: string;
  available_balance: number;
  locked_balance: number;
  updated_at: string;
}

export type TransactionType = 'purchase' | 'reward' | 'tip' | 'transfer' | 'spend' | 'stake' | 'unstake' | 'redemption' | 'earned';

export interface VQTransaction {
  id: string;
  idempotency_key?: string;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  type: TransactionType;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  created_at: string;
}
