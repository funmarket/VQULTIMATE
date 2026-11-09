import { supabase } from '../../lib/supabase';
import { VqAccount, VQTransaction, TransactionType } from './types';

export interface VQTransactionHistory {
  transactions: VQTransaction[];
  error: string | null;
}

export async function fetchVqAccount(userId: string): Promise<VqAccount | null> {
  try {
    const { data, error } = await supabase
      .from('vq_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as VqAccount;
  } catch {
    return null;
  }
}

export async function fetchUserTransactions(userId: string): Promise<VQTransactionHistory> {
  try {
    const { data, error } = await supabase
      .from('vq_transactions')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { transactions: [], error: error.message };
    }

    return { transactions: (data || []) as VQTransaction[], error: null };
  } catch (err: any) {
    return {
      transactions: [],
      error: err?.message || 'Transaction history could not be loaded from Supabase.'
    };
  }
}

export async function lookupUserByHandle(handle: string): Promise<{ id: string; username: string } | null> {
  const clean = handle.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle')
      .ilike('handle', clean)
      .maybeSingle();

    if (error || !data) return null;
    return { id: String(data.id), username: String(data.handle) };
  } catch {
    return null;
  }
}

export async function executeVqTransfer(params: {
  toUserId: string;
  amount: number;
  type: TransactionType;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : 'idemp-' + Date.now() + '-' + Math.random();
    const { error } = await supabase.rpc('execute_vq_transfer', {
      p_idempotency_key: idempotencyKey,
      p_to_user_id: params.toUserId,
      p_amount: params.amount,
      p_type: params.type,
      p_description: params.description || 'Transfer between explorers'
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Transfer execution failed.' };
  }
}
