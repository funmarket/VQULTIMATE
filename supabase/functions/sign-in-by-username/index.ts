/**
 * Username-and-password login without revealing another account's email.
 * Deployed with verify_jwt=false because this endpoint is for signed-out users.
 * No admin credentials or email addresses are returned to the browser.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const response = (status: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status, headers: cors });
const invalid = () => response(401, { error: 'Invalid username or password.' });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return response(405, { error: 'Method not allowed.' });
  try {
    const input = await request.json();
    const username = typeof input?.username === 'string' ? input.username.toLowerCase().trim().replace(/^@/, '') : '';
    const password = input?.password;
    if (!/^[a-z0-9_]{3,32}$/.test(username) || typeof password !== 'string' || password.length < 1 || password.length > 1024) return invalid();
    const endpoint = Deno.env.get('SUPABASE_URL');
    const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!endpoint || !adminKey || !publicKey) return response(503, { error: 'Authentication unavailable.' });

    const admin = createClient(endpoint, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin
      .from('profiles').select('id').eq('handle', username).maybeSingle();
    if (profileError || !profile) return invalid();

    let authId: string | null = null;
    const { data: link } = await admin.from('s00_test_identity_links')
      .select('auth_user_id').eq('legacy_profile_id', profile.id).maybeSingle();
    if (link?.auth_user_id) authId = link.auth_user_id;
    else if (/^usr_[0-9a-f-]{36}$/.test(profile.id)) authId = profile.id.slice(4);
    if (!authId) return invalid();

    const { data: account, error: accountError } = await admin.auth.admin.getUserById(authId);
    if (accountError || !account.user?.email) return invalid();

    const client = createClient(endpoint, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: login, error: loginError } = await client.auth.signInWithPassword({
      email: account.user.email, password,
    });
    if (loginError || !login.session) return invalid();
    return response(200, {
      access_token: login.session.access_token,
      refresh_token: login.session.refresh_token,
    });
  } catch {
    return invalid();
  }
});
