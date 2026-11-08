import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('src/components/HomeTab.tsx');
const modal = read('src/components/CreateFlashModal.tsx');
const events = read('src/domains/d11_events/api.ts');

test('Home uses server-backed D11 creator permission, not profile role or username', () => {
  assert.match(home, /import \{ fetchActiveFlashEvent, canCreateFlashEvent, FlashEvent \} from '\.\.\/domains\/d11_events'/);
  assert.match(home, /canCreateFlashEvent\(\)\.then\(/);
  assert.match(home, /\[user\?\.id\]/);
  assert.match(home, /onClick=\{handleCreateFlashEntry\}/);
  assert.match(home, /allowed = await canCreateFlashEvent\(\)/);
  assert.match(home, /canCreate=\{canCreateFlash\}/);
  assert.doesNotMatch(home, /user\?\.(?:role|username)\s*===\s*['"]admin['"]/);
  assert.match(modal, /canCreate: boolean/);
  assert.match(modal, /const isAdmin = canCreate/);
  assert.doesNotMatch(modal, /user\?\.username === ['"]funmarketmn['"]/);
});

test('Home retains a stable event frame regardless of creator permission or event availability', () => {
  assert.doesNotMatch(home, /\{flashEvent && secondsLeft > 0 && \(\s*<div className="rounded-3xl/);
  assert.match(home, /<div className="rounded-3xl bg-neutral-900 border border-purple-500\/30 p-5 shadow-2xl space-y-4 animate-fadeIn relative overflow-hidden"/);
  assert.match(home, /\{hasActiveFlash \? \(/);
  assert.match(home, /No Flash Events are active right now\./);
  assert.match(home, /Explore Vibes/);
  assert.match(home, /onClick=\{handleCreateFlashEntry\}/);
  assert.match(home, /setIsFlashUpgradeOpen\(true\)/);
});

test('D11 event API is feature-flagged, time-bounded, and denies unverified creators', () => {
  assert.match(events, /VITE_D11_FLASH_EVENTS_ENABLED/);
  assert.match(events, /if \(!eventsEnabled\) return null/);
  assert.match(events, /\.from\('flash_events'\)/);
  assert.match(events, /\.lte\('starts_at'/);
  assert.match(events, /\.gt\('ends_at'/);
  assert.match(events, /supabase\.auth\.getUser\(\)/);
  assert.match(events, /vq_admin_assignments/);
  assert.match(events, /export async function canCreateFlashEvent/);
  assert.match(events, /if \(!eventsEnabled\)/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
});

test('Home clears stale event countdowns and never invents a Flash reward', () => {
  assert.match(home, /setSecondsLeft\(ev\?\.seconds_left \?\? 0\)/);
  assert.match(home, /setSecondsLeft\(0\)/);
  assert.match(home, /Live Flash Event/);
  assert.doesNotMatch(home, /Reward: 500|VIBE Points/);
  assert.match(home, /\{minutesLeft\}m left/);
});
