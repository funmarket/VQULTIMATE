import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/components/HomeTab.tsx', import.meta.url), 'utf8');

test('Flash Events frame remains mounted even without an active event', () => {
  assert.doesNotMatch(home, /\{flashEvent && secondsLeft > 0 && \(\s*<div className="rounded-3xl/);
  assert.match(home, /<div className="rounded-3xl bg-neutral-900 border border-purple-500\/30 p-5 shadow-2xl space-y-4 animate-fadeIn relative overflow-hidden"/);
  assert.match(home, /\{hasActiveFlash \? \(/);
  assert.match(home, /No Flash Events are active right now\./);
});

test('non-live state has no fabricated event, reward or countdown', () => {
  assert.match(home, /Explore Vibes/);
  assert.match(home, /Check back for the next Flash Event\./);
  assert.match(home, /\{flashEvent\?\.title\}/);
  assert.match(home, /\{flashEvent\?\.description\}/);
  assert.match(home, /\{minutesLeft\}m left/);
  assert.doesNotMatch(home, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
});
