import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/components/HomeTab.tsx', import.meta.url), 'utf8');

test('Flash imagery falls back to genuine city-pulse imagery when location-based places have no photo', () => {
  assert.match(home, /pulsesSummary\.cities\.find\(city => Boolean\(city\.imageUrl\)\)/);
  assert.match(home, /photoPlace \? 'place' : featuredCity \? 'city' : 'none'/);
  assert.match(home, /City discovery/);
  assert.match(home, /src=\{featuredCity\.imageUrl\}/);
});

test('City discovery is not represented as an active Flash Event or venue', () => {
  assert.match(home, /aria-label="City discovery image"/);
  assert.match(home, /No Flash Events are active right now\./);
  assert.match(home, /\{hasActiveFlash \? \(/);
  assert.match(home, /onClick=\{\(\) => onNavigateTab\('explore'\)\}/);
});

test('When genuine imagery is unavailable, card dimensions and honest placeholder remain', () => {
  assert.match(home, /relative h-32 rounded-2xl overflow-hidden/);
  assert.match(home, /Explore local vibes/);
  assert.match(home, /!photoPlace && !featuredCity/);
});
