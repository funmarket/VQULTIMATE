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

export async function resolveAuthUuid(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(cleanId)) {
    return cleanId;
  }

  if (cleanId.startsWith('usr_')) {
    const suffix = cleanId.slice(4);
    if (uuidRegex.test(suffix)) {
      return suffix;
    }
  }

  const cleanHandle = cleanId.replace(/^@/, '').toLowerCase();
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, handle')
      .or(`id.eq.${cleanId},id.eq.usr_${cleanId},handle.ilike.${cleanHandle},handle.ilike.@${cleanHandle},display_name.ilike.${cleanHandle}`)
      .maybeSingle();

    if (prof && prof.id) {
      const pid = String(prof.id);
      if (uuidRegex.test(pid)) return pid;
      if (pid.startsWith('usr_')) {
        const sub = pid.slice(4);
        if (uuidRegex.test(sub)) return sub;
      }
      const { data: vqAcc } = await supabase
        .from('vq_accounts')
        .select('user_id')
        .eq('user_id', pid)
        .maybeSingle();
      if (vqAcc && vqAcc.user_id) return String(vqAcc.user_id);
    }
  } catch {}

  try {
    const { data: link } = await supabase
      .from('s00_test_identity_links')
      .select('auth_user_id')
      .eq('legacy_profile_id', cleanId)
      .maybeSingle();
    if (link && link.auth_user_id) {
      return String(link.auth_user_id);
    }
  } catch {}

  try {
    const { data: acc } = await supabase
      .from('vq_accounts')
      .select('user_id')
      .eq('user_id', cleanId)
      .maybeSingle();
    if (acc && acc.user_id) return String(acc.user_id);
  } catch {}

  return null;
}

export async function lookupUserByHandle(handle: string): Promise<{ id: string; username: string } | null> {
  const clean = handle.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .or(`handle.ilike.${clean},handle.ilike.@${clean},display_name.ilike.${clean},id.eq.${clean},id.eq.usr_${clean}`)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: String(data.id),
      username: String(data.handle || data.display_name || clean)
    };
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
    const resolvedUuid = await resolveAuthUuid(params.toUserId);
    if (!resolvedUuid) {
      return {
        success: false,
        error: `Recipient "${params.toUserId}" could not be resolved to a valid Supabase Auth UUID.`
      };
    }

    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : 'idemp-' + Date.now() + '-' + Math.random();
    const { error } = await supabase.rpc('execute_vq_transfer', {
      p_idempotency_key: idempotencyKey,
      p_to_user_id: resolvedUuid,
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
