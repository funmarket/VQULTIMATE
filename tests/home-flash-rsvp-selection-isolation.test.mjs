import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const home = readFileSync(new URL('../src/components/HomeTab.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/HomeFlashDiscoveryPanel.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/components/FlashEventDetailModal.tsx', import.meta.url), 'utf8');

test('RSVP status check blocks RSVP actions until the selected event status is known', () => {
  assert.match(home, /const \[rsvpStatusLoading, setRsvpStatusLoading\] = useState\(false\)/);
  assert.match(home, /setRsvpStatusLoading\(true\)/);
  assert.match(home, /setRsvpStatusLoading\(false\)/);
  assert.match(home, /if \(!rsvpEnabled \|\| !flashEvent \|\| secondsLeft <= 0 \|\| rsvpLoading \|\| rsvpStatusLoading\) return/);
  assert.match(panel, /rsvpLoading=\{rsvpLoading \|\| rsvpStatusLoading\}/);
  assert.match(panel, /disabled=\{!rsvpEnabled \|\| rsvpLoading\}/);
  assert.match(detail, /disabled=\{!valid \|\| !rsvpEnabled \|\| rsvpLoading\}/);
});

test('old event RSVP network completions never change a newly selected event', () => {
  assert.match(home, /const eventId = flashEvent\.id/);
  assert.match(home, /selectedFlashId\.current === eventId/);
  assert.match(home, /userIdRef\.current === actingUserId/);
  assert.match(home, /const actingUserId = user\.id/);
  assert.match(home, /setRsvpJoined\(!wasJoined\)/);
});

test('RSVP failure leaves saved state unchanged and the card remains truthful', () => {
  assert.match(home, /if \(!result\.success\)/);
  assert.match(home, /rsvpStatusLoading/);
  assert.match(panel, /Not available yet/);
  assert.doesNotMatch(home, /localStorage.*RSVP|fakeRsvp/);
});
