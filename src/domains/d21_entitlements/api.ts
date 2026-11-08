import { supabase } from '../../lib/supabase';

export type FlashUpgradePlan = 'pro' | 'business';

const entitlementsEnabled = import.meta.env.VITE_D21_ENTITLEMENTS_ENABLED === 'true';

export interface AccountEntitlement {
  plan: FlashUpgradePlan;
  status: string;
  starts_at: string;
  expires_at: string | null;
}

/** Entitlements are minted by a trusted provider/admin service, never by profile edits. */
export async function getVerifiedEventEntitlement(): Promise<AccountEntitlement | null> {
  if (!entitlementsEnabled) return null;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;
  const { data, error } = await supabase.from('account_entitlements')
    .select('plan,status,starts_at,expires_at')
    .eq('auth_user_id', auth.user.id)
    .eq('status', 'active')
    .in('plan', ['pro', 'business'])
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(5);
  if (error) throw new Error('Could not verify your account entitlement.');
  const now = Date.now();
  const current = (data || []).find(row => !row.expires_at || Date.parse(row.expires_at) > now);
  return current ? current as AccountEntitlement : null;
}

/**
 * A request does not change a plan or grant publishing permission.
 * No payment is charged and no subscription is activated.
 */
export async function requestAccountUpgrade(requested_plan: FlashUpgradePlan): Promise<{ success: boolean; error?: string }> {
  if (!['pro','business'].includes(requested_plan)) {
    return { success: false, error: 'Choose Pro or Business.' };
  }
  if (!entitlementsEnabled) {
    return { success: false, error: 'Account upgrade requests are not available yet.' };
  }
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { success: false, error: 'Sign in to request an account upgrade.' };
  }
  const { error } = await supabase.from('account_upgrade_requests').insert({ requested_plan });
  if (error) {
    return { success: false, error: error.code === '23505' ? 'An upgrade request is already pending.' : 'Your request could not be submitted.' };
  }
  return { success: true };
}

export interface PendingUpgradeRequest {
  id: string;
  auth_user_id: string;
  requested_plan: FlashUpgradePlan;
  created_at: string;
}

export async function fetchPendingUpgradeRequests(): Promise<PendingUpgradeRequest[]> {
  if (!entitlementsEnabled) return [];
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to view upgrade requests.');
  const { data: admin, error: adminError } = await supabase.from('vq_admin_assignments')
    .select('auth_user_id')
    .eq('auth_user_id', auth.user.id)
    .eq('role', 'platform_admin')
    .eq('active', true)
    .maybeSingle();
  if (adminError || !admin) throw new Error('Administrator authorization required.');
  const { data, error } = await supabase.from('account_upgrade_requests')
    .select('id,auth_user_id,requested_plan,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw new Error('Could not load upgrade requests.');
  return (data || []) as PendingUpgradeRequest[];
}
