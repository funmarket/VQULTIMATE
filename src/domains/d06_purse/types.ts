export interface VQTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent' | 'staked' | 'reward';
  amount: number;
  description: string;
  created_at: string;
}
