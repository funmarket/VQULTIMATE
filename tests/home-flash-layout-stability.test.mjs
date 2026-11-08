import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home = read('src/components/HomeTab.tsx');
const panel = read('src/components/HomeFlashDiscoveryPanel.tsx');

test('Home always mounts a single switchable visual card', () => {
  assert.match(home, /<HomeFlashDiscoveryPanel/);
  assert.match(panel, /if \(hasActiveFlash && flashEvent\)/);
  assert.match(panel, /Vibe Suggestions/);
  assert.match(panel, /Flash Event Alert!/);
  assert.match(panel, /const shell = 'rounded-\[30px\]/);
});
test('no fabricated event, reward, RSVP or match in the fallback', () => {
  assert.match(panel, /No suggestions available yet/);
  assert.match(panel, /EXPLORE NOW!/);
  assert.match(panel, /timeLeft/);
  assert.doesNotMatch(panel, /Secret Pop-Up Gallery|Loca Haus|500 VIBE POINTS|92% MATCH/);
});
