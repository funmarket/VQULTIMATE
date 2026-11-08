import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home = read('src/components/HomeTab.tsx');
const panel = read('src/components/HomeFlashDiscoveryPanel.tsx');
const modal = read('src/components/CreateFlashModal.tsx');
const events = read('src/domains/d11_events/api.ts');

test('Flash creator permissions are checked server-side at click and submission', () => {
  assert.match(home, /canCreateFlashEvent\(\)\.then\(/);
  assert.match(home, /allowed = await canCreateFlashEvent\(\)/);
  assert.match(home, /canCreate=\{canCreateFlash\}/);
  assert.match(panel, /onCreateFlash/);
  assert.match(modal, /canCreate: boolean/);
  assert.match(events, /if \(!\(await canCreateFlashEvent\(\)\)\)/);
});
test('event and suggestion visuals are mutually exclusive and honest', () => {
  assert.match(home, /<HomeFlashDiscoveryPanel/);
  assert.match(panel, /if \(hasActiveFlash && flashEvent\)/);
  assert.match(panel, /Vibe Suggestions/);
  assert.match(panel, /Flash Event Alert!/);
  assert.doesNotMatch(panel, /Reward: 500|VIBE Points/);
});
test('D11 uses feature-flagged, time-bounded Supabase query', () => {
  assert.match(events, /VITE_D11_FLASH_EVENTS_ENABLED/);
  assert.match(events, /if \(!eventsEnabled\) return null/);
  assert.match(events, /\.from\('flash_events'\)/);
  assert.match(events, /\.lte\('starts_at'/);
  assert.match(events, /\.gt\('ends_at'/);
  assert.match(events, /vq_admin_assignments/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
});
