import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');

const d11 = read('src/domains/d11_events/api.ts');
const types = read('src/domains/d11_events/types.ts');
const home = read('src/components/HomeTab.tsx');
const card = read('src/components/HomeFlashDiscoveryPanel.tsx');
const create = read('src/components/CreateFlashModal.tsx');
const detail = read('src/components/FlashEventDetailModal.tsx');
const migration = read('supabase/migrations/20261108040000_d11_flash_events_authorized.sql');
const paid = read('supabase/migrations/20261108042000_d21_flash_entitlements_upgrade_requests.sql');
const rsvp = read('supabase/migrations/20261108044000_d11_rsvp_suggestions.sql');

test('discovery query starts up to 60 minutes ahead, expires at end, and never reads another domain', () => {
  assert.match(d11, /DISCOVERY_WINDOW_MINUTES = 60/);
  assert.match(d11, /fetchDiscoverableFlashEvents/);
  assert.match(d11, /\.lte\('starts_at'/);
  assert.match(d11, /\.gt\('ends_at'/);
  assert.match(d11, /\.order\('starts_at'/);
  assert.match(d11, /\.limit\(MAX_DISCOVERY_ITEMS\)/);
  assert.match(d11, /start <= now \+ 60 \* 60 \* 1000/);
  assert.match(d11, /seconds_left:/);
  assert.match(types, /starts_at: string/);
  assert.doesNotMatch(d11, /vibe_flash_windows/);
});
test('client event visibility and RSVP policies agree with 60-minute timing', () => {
  assert.match(migration, /starts_at <= now\(\) \+ interval '60 minutes'/);
  assert.match(rsvp, /e\.starts_at <= now\(\) \+ interval '60 minutes'/);
  assert.match(migration, /ends_at > now\(\)/);
  assert.match(rsvp, /e\.ends_at > now\(\)/);
});
test('scheduled create is authorized for admin or proven Pro or Business without a five-minute cap', () => {
  assert.match(migration, /starts_at >= now\(\) - interval '2 minutes'/);
  assert.match(paid, /account_entitlements/);
  assert.match(paid, /e\.status = 'active'/);
  assert.doesNotMatch(paid, /starts_at <= now\(\) \+ interval '5 minutes'/);
  assert.match(create, /type="datetime-local"/);
  assert.match(create, /place_id: placeId \|\| null/);
  assert.match(home, /places=\{places\}/);
  assert.match(create, /becomes discoverable 60 minutes/);
});
test('live event card reads genuine list, thumbnails select a real event and HUNT opens full details', () => {
  assert.match(home, /fetchDiscoverableFlashEvents\(/);
  assert.match(home, /selectedFlashId\.current/);
  assert.match(home, /onSelectFlashEvent=\{selectFlashEvent\}/);
  assert.match(card, /galleryEvents\.filter|flashEvents\.filter/);
  assert.match(card, /onSelectFlashEvent\(event\)/);
  assert.match(card, /places\.find\(place => place\.id === event\.place_id\)/);
  assert.match(card, /STARTS IN/);
  assert.match(card, /FlashEventDetailModal/);
  assert.match(card, /setShowFlashDetail\(true\)/);
  assert.match(detail, /event\.starts_at/);
  assert.match(detail, /event\.ends_at/);
  assert.match(detail, /onViewPlace\(place\)/);
  assert.match(detail, /onRsvp/);
  assert.doesNotMatch(card, /Secret Pop-Up Gallery|RSVP · 84|500 VIBE POINTS/);
});
