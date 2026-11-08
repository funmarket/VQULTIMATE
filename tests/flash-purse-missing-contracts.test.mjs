import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const events = read('src/domains/d11_events/api.ts');
const purse = read('src/domains/d06_purse/api.ts');
const purseTab = read('src/components/PurseTab.tsx');
const home = read('src/components/HomeTab.tsx');
const eventMigration = read('supabase/migrations/20261108040000_d11_flash_events_authorized.sql');
const ledgerMigration = read('supabase/migrations/20261108041000_d06_ledger_owner_read_security.sql');

test('D11 uses an actual event table behind an opt-in schema gate, never invents live events', () => {
  assert.doesNotMatch(events, /\.rpc\(['"]get_active_flash_event['"]\)/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
  assert.match(events, /VITE_D11_FLASH_EVENTS_ENABLED/);
  assert.match(events, /if \(!eventsEnabled\) return null/);
  assert.match(events, /\.from\('flash_events'\)/);
  assert.match(events, /\.insert\(/);
  assert.match(events, /canCreateFlashEvent/);
  assert.match(home, /canCreateFlashEvent/);
  assert.match(home, /setSecondsLeft\(ev\?\.seconds_left \?\? 0\)/);
});

test('D11 migration separates long-form Events from D18 Flash windows', () => {
  assert.match(eventMigration, /create table if not exists public\.flash_events/);
  assert.doesNotMatch(eventMigration, /create table.*vibe_flash_windows|drop table/i);
  assert.match(eventMigration, /created_by_auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(eventMigration, /a\.role = 'platform_admin'/);
  assert.match(eventMigration, /create policy d11_admin_only_event_create/);
  assert.match(eventMigration, /for select to anon,authenticated/);
});

test('D06 reads through an authenticated identity and server-enforced owner policy', () => {
  assert.doesNotMatch(purse, /\.from\(['"]vq_transactions['"]\)/);
  assert.match(purse, /VITE_D06_LEDGER_READ_ENABLED/);
  assert.match(purse, /supabase\.auth\.getUser\(\)/);
  assert.match(purse, /\.from\('vq_ledger'\)/);
  assert.doesNotMatch(purse, /\.eq\('user_id'/);
  assert.match(ledgerMigration, /owner_auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(ledgerMigration, /revoke all on table public\.vq_ledger from PUBLIC, anon, authenticated/);
  assert.match(ledgerMigration, /drop policy if exists "Public access policy for vq_ledger"/);
});

test('Purse reports unavailable history instead of false empty success', () => {
  assert.match(purseTab, /setHistoryError\(result\.error\)/);
  assert.match(purseTab, /historyError \? \(/);
  assert.match(purseTab, /Transaction history unavailable/);
});

test('Media upload failures must never publish ephemeral object URLs', () => {
  const drift = read('src/domains/d15_drift/api.ts');
  const share = read('src/components/ShareTab.tsx');
  const posts = read('src/domains/d05_vibe/api.ts');
  assert.doesNotMatch(drift.slice(drift.indexOf('export async function uploadDriftMedia'), drift.indexOf('// 10. Moderation actions')), /URL\.createObjectURL|success: true, url: objectUrl/);
  assert.match(share, /if \(!uploadRes\.success \|\| !uploadRes\.url/);
  assert.doesNotMatch(share.slice(share.indexOf('const handleShareInApp'), share.indexOf('const \[mode,')), /URL\.createObjectURL/);
  assert.match(posts, /post\.image_url\?\.startsWith\('blob:'\)/);
  assert.match(read('src/components/drift/DriftMessageItem.tsx'), /temporary browser link/);
});
