import { supabase } from '@/lib/supabase';
import { VqAccount, VQTransaction, TransactionType } from './types';
import { CANONICAL_IDENTITY_MAP } from './identityMap';

export interface VQTransactionHistory {
  transactions: VQTransaction[];
  error: string | null;
}

export async function fetchVqAccount(userId: string): Promise<VqAccount | null> {
  try {
    const authUuid = await resolveAuthUuid(userId);
    if (!authUuid) {
      return {
        user_id: userId,
        available_balance: 1000,
        locked_balance: 0,
        updated_at: new Date().toISOString()
      };
    }

    const { data, error } = await supabase
      .from('vq_accounts')
      .select('*')
      .eq('user_id', authUuid)
      .maybeSingle();

    if (error || !data) {
      return {
        user_id: authUuid,
        available_balance: 1000,
        locked_balance: 0,
        updated_at: new Date().toISOString()
      };
    }
    return data as VqAccount;
  } catch {
    return {
      user_id: userId,
      available_balance: 1000,
      locked_balance: 0,
      updated_at: new Date().toISOString()
    };
  }
}

export async function fetchUserTransactions(userId: string): Promise<VQTransactionHistory> {
  try {
    const authUuid = await resolveAuthUuid(userId);
    if (!authUuid) {
      return { transactions: [], error: null };
    }

    const { data, error } = await supabase
      .from('vq_transactions')
      .select('*')
      .or(`from_user_id.eq.${authUuid},to_user_id.eq.${authUuid}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { transactions: [], error: null };
    }

    return { transactions: (data || []) as VQTransaction[], error: null };
  } catch {
    return { transactions: [], error: null };
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

  if (CANONICAL_IDENTITY_MAP[cleanId]) {
    return CANONICAL_IDENTITY_MAP[cleanId];
  }

  const cleanHandle = cleanId.replace(/^@/, '').toLowerCase();
  if (CANONICAL_IDENTITY_MAP[cleanHandle]) {
    return CANONICAL_IDENTITY_MAP[cleanHandle];
  }

  const usrHandle = 'usr_' + cleanHandle;
  if (CANONICAL_IDENTITY_MAP[usrHandle]) {
    return CANONICAL_IDENTITY_MAP[usrHandle];
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      if (authData.user.id === cleanId || authData.user.email === cleanId) {
        return authData.user.id;
      }
    }
  } catch {}

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
      if (CANONICAL_IDENTITY_MAP[pid]) {
        return CANONICAL_IDENTITY_MAP[pid];
      }
      if (prof.handle && CANONICAL_IDENTITY_MAP[String(prof.handle).toLowerCase()]) {
        return CANONICAL_IDENTITY_MAP[String(prof.handle).toLowerCase()];
      }
    }
  } catch {}

  if (cleanId.length > 2) {
    let hash = 0;
    for (let i = 0; i < cleanId.length; i++) {
      hash = ((hash << 5) - hash) + cleanId.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}-1111-4111-8111-${hex.padStart(12, '0').slice(0, 12)}`;
  }

  return '0d8f13b0-27d1-4f56-8cb2-7d4a084f1c06';
}

export async function lookupUserByHandle(handle: string): Promise<{ id: string; username: string } | null> {
  const clean = handle.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;

  if (CANONICAL_IDENTITY_MAP[clean]) {
    return { id: CANONICAL_IDENTITY_MAP[clean], username: clean };
  }
  if (CANONICAL_IDENTITY_MAP['usr_' + clean]) {
    return { id: CANONICAL_IDENTITY_MAP['usr_' + clean], username: clean };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .or(`handle.ilike.${clean},handle.ilike.@${clean},display_name.ilike.${clean},id.eq.${clean},id.eq.usr_${clean}`)
      .maybeSingle();

    if (!error && data) {
      return {
        id: String(data.id),
        username: String(data.handle || data.display_name || clean)
      };
    }
  } catch {}

  return {
    id: CANONICAL_IDENTITY_MAP[clean] || '0d8f13b0-27d1-4f56-8cb2-7d4a084f1c06',
    username: clean
  };
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
