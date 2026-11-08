import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261108044000_d11_rsvp_suggestions.sql');
const api = read('src/domains/d11_events/participation.ts');
const panel = read('src/components/HomeFlashDiscoveryPanel.tsx');
const home = read('src/components/HomeTab.tsx');
test('D11 RSVP RLS requires authenticated self and real active unexpired event', () => {
  assert.match(migration, /create table if not exists public\.flash_event_rsvps/);
  assert.match(migration, /unique \(event_id, auth_user_id\)/);
  assert.match(migration, /created_by_auth_user_id|auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /e\.status = 'active'/);
  assert.match(migration, /e\.starts_at <= now\(\)/);
  assert.match(migration, /e\.ends_at > now\(\)/);
  assert.match(migration, /for delete to authenticated/);
  assert.match(migration, /on public\.flash_event_rsvps/);
});
test('Vibe suggestions are user-owned moderation submissions not automatically published', () => {
  assert.match(migration, /create table if not exists public\.vibe_suggestion_submissions/);
  assert.match(migration, /status text not null default 'pending'/);
  assert.match(migration, /for insert to authenticated/);
  assert.match(migration, /auth_user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /grant update.*vibe_suggestion_submissions to authenticated/i);
});
test('Participation API fails closed until migration flag, uses Supabase auth and real tables', () => {
  assert.match(api, /VITE_D11_PARTICIPATION_ENABLED/);
  assert.match(api, /supabase\.auth\.getUser\(\)/);
  assert.match(api, /from\('flash_event_rsvps'\)/);
  assert.match(api, /from\('vibe_suggestion_submissions'\)/);
  assert.match(api, /cancelFlashRsvp/);
  assert.match(api, /getMyFlashRsvp/);
  assert.match(api, /submitVibeSuggestion/);
  assert.doesNotMatch(api, /localStorage|Math\.random|fake|mock/i);
});
test('Both approved cards retain labels and wire real RSVP and Suggest Vibe actions', () => {
  assert.match(panel, /Flash Event Alert!/);
  assert.match(panel, /Vibe Suggestions/);
  assert.match(panel, /\+ SUGGEST VIBE/);
  assert.match(panel, /RSVP/);
  assert.match(panel, /onSuggestVibe/);
  assert.match(panel, /onRsvp/);
  assert.match(home, /onSubmit=\{submitVibeSuggestion\}/);
  assert.match(home, /joinFlashEvent\(/);
  assert.match(home, /cancelFlashRsvp\(/);
  assert.match(home, /getMyFlashRsvp\(/);
  assert.match(home, /Suggestion submitted for review/);
});
