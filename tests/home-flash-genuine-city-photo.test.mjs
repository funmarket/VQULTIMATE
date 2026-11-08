import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const panel = readFileSync(new URL('../src/components/HomeFlashDiscoveryPanel.tsx',import.meta.url),'utf8');

test('no-event suggestion feed reuses genuine city image data', () => {
  assert.match(panel, /pulsesSummary\.cities\.filter/);
  assert.match(panel, /city\.imageUrl/);
  assert.match(panel, /kind: 'city'/);
  assert.match(panel, /onNavigateTab\('explore'\)/);
});
test('live event image is tied only to actual event place', () => {
  assert.match(panel, /places\.find\(place => place\.id === flashEvent\?\.place_id\)/);
  assert.match(panel, /eventPhoto/);
  assert.doesNotMatch(panel, /CANONICAL_CITY_BASELINES|Secret Pop-Up Gallery/);
});
test('missing genuine media has an honest fixed-size fallback', () => {
  assert.match(panel, /relative h-56 overflow-hidden rounded-2xl/);
  assert.match(panel, /No suggestions available yet/);
  assert.match(panel, /Event photo unavailable/);
});
