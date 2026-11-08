import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const home = read('src/components/HomeTab.tsx');
const panel = read('src/components/HomeFlashDiscoveryPanel.tsx');
const flash = read('src/domains/d11_events/api.ts');

test('Home delegates its complete visual card to the two-state component', () => {
  assert.match(home, /<HomeFlashDiscoveryPanel/);
  assert.match(home, /onCreateFlash=\{handleCreateFlashEntry\}/);
  assert.match(home, /onSelectPlace=\{onSelectPlace\}/);
  assert.match(home, /onNavigateTab=\{onNavigateTab\}/);
  assert.doesNotMatch(home, /Flash Events slot retains its layout/);
});
test('active D11 event renders the approved live labels from real event data', () => {
  assert.match(panel, /Flash Event Alert!/);
  assert.match(panel, /LIMITED DROP/);
  assert.match(panel, /HUNT NOW!/);
  assert.match(panel, /\+ CREATE FLASH/);
  assert.match(panel, /HUNT/);
  assert.match(panel, /RSVP/);
  assert.match(panel, /REWARDS/);
  assert.match(panel, /MORE FLASH EVENTS/);
  assert.match(panel, /flashEvent\.title/);
  assert.match(panel, /flashEvent\.description/);
  assert.match(panel, /flashEvent\.ends_at/);
  assert.match(panel, /More Flash Events are not available yet/);
});
test('no active event replaces the entire card with the approved Vibe Suggestions design', () => {
  assert.match(panel, /Vibe Suggestions/);
  assert.match(panel, /FOR YOU/);
  assert.match(panel, /EXPLORE NOW!/);
  assert.match(panel, /\+ SUGGEST VIBE/);
  assert.match(panel, /Curated for You/);
  assert.match(panel, /SPOTS NEAR YOU/);
  assert.match(panel, /HAPPENING SOON/);
  assert.match(panel, /TRENDING NOW/);
  assert.match(panel, /MORE SUGGESTIONS/);
  assert.match(panel, /VIBEQUEST/);
  assert.match(panel, /onSelectPlace\(place\)/);
  assert.match(panel, /onNavigateTab\('explore'\)/);
});
test('images and thumbnails come from existing APIs and render truthful empty states', () => {
  assert.match(panel, /places\.filter/);
  assert.match(panel, /pulsesSummary\.cities/);
  assert.match(panel, /No suggestions available yet/);
  assert.match(panel, /image_url/);
  assert.match(panel, /imageUrl/);
});
test('no sample RSVP, reward or match values are represented as actual data', () => {
  assert.doesNotMatch(panel, /Secret Pop-Up Gallery|Loca Haus|500 VIBE POINTS|92% MATCH|1\.2K VIBES|RSVP\s*[·•]\s*84|98 MIN LEFT/);
  assert.match(panel, /RSVP unavailable/);
  assert.match(panel, /Rewards not configured/);
  assert.match(panel, /Suggestion submissions are not available yet/);
  assert.match(flash, /VITE_D11_FLASH_EVENTS_ENABLED/);
});
