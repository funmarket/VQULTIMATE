import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home = read('src/components/HomeTab.tsx');
const panel = read('src/components/HomeFlashDiscoveryPanel.tsx');
const api = read('src/domains/d11_events/api.ts');

test('photos come from real discovery sources and event-linked place', () => {
  assert.match(panel, /places\.filter\(place => Boolean\(place\.image_url\)\)/);
  assert.match(panel, /pulsesSummary\.cities\.filter\(city => Boolean\(city\.imageUrl\)\)/);
  assert.match(panel, /eventPlace\?\.image_url/);
  assert.match(panel, /Event photo unavailable/);
  assert.match(panel, /No suggestions available yet/);
});
test('creation entry remains available and regular users receive an upgrade option', () => {
  assert.match(panel, /\+ CREATE FLASH/);
  assert.match(home, /setIsFlashUpgradeOpen\(true\)/);
  assert.match(home, /Upgrade to Pro or Business/);
  assert.match(home, /Request Pro upgrade/);
  assert.match(home, /Request Business upgrade/);
});
test('profile labels cannot bypass server authorizations', () => {
  assert.match(home, /allowed = await canCreateFlashEvent\(\)/);
  assert.match(home, /Flash Event publishing is not yet enabled for this account/);
  assert.match(api, /if \(!\(await canCreateFlashEvent\(\)\)\)/);
  assert.match(api, /vq_admin_assignments/);
});
