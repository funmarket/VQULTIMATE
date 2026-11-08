import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ent = read('src/domains/d21_entitlements/api.ts');
const event = read('src/domains/d11_events/api.ts');
const home = read('src/components/HomeTab.tsx');
const admin = read('src/components/AdminModal.tsx');
const sql = read('supabase/migrations/20261108042000_d21_flash_entitlements_upgrade_requests.sql');
test('entitlements are server identity bound, not profile account_type',()=>{
  assert.match(ent,/supabase\.auth\.getUser\(\)/);
  assert.match(ent,/from\('account_entitlements'\)/);
  assert.match(ent,/auth_user_id/);
  assert.match(ent,/expires_at/);
  assert.doesNotMatch(ent,/profiles.*account_type/);
  assert.match(event,/getVerifiedEventEntitlement\(\)/);
  assert.match(event,/canCreateFlashEvent/);
  assert.doesNotMatch(event,/row\.account_type/);
});
test('upgrade is a real authenticated request, never a self-granted paid plan',()=>{
  assert.match(ent,/from\('account_upgrade_requests'\)\.insert/);
  assert.match(ent,/requested_plan/);
  assert.match(ent,/supabase\.auth\.getUser\(\)/);
  assert.match(home,/requestAccountUpgrade\(/);
  assert.match(home,/Request Pro upgrade/);
  assert.match(home,/Request Business upgrade/);
  assert.match(home,/Request submitted for review/);
  assert.doesNotMatch(home,/setUser\(\{.*accountType/);
});
test('admin request control is present without fabricated admin statistics',()=>{
  assert.match(admin,/Platform Administrator/);
  assert.match(admin,/Account upgrade requests/);
  assert.match(admin,/fetchPendingUpgradeRequests\(/);
  assert.match(admin,/No upgrade requests/);
  assert.doesNotMatch(admin,/100% HEALTHY|LIVE SYNC|CONFIRMED/);
});
test('SQL grants no user entitlement write and requires server verification for D11',()=>{
  assert.match(sql,/create table if not exists public\.account_entitlements/);
  assert.match(sql,/create table if not exists public\.account_upgrade_requests/);
  assert.match(sql,/revoke all on public\.account_entitlements from PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql,/grant insert.*account_entitlements to authenticated/i);
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/d11_admin_or_entitled_event_create/);
  assert.match(sql,/account_entitlements e/);
  assert.match(sql,/e\.status = 'active'/);
  assert.match(sql,/e\.expires_at is null or e\.expires_at > now\(\)/);
});
