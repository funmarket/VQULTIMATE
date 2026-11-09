import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const events = readFileSync(new URL('../src/domains/d11_events/api.ts', import.meta.url), 'utf8');
const purse = readFileSync(new URL('../src/domains/d06_purse/api.ts', import.meta.url), 'utf8');
const purseTab = readFileSync(new URL('../src/components/PurseTab.tsx', import.meta.url), 'utf8');

test('D11 reads real Flash Events without fabricating events', () => {
  assert.match(events, /\.from\(['"]flash_events['"]\)/);
  assert.match(events, /fetchActiveFlashEvent/);
  assert.match(events, /fetchFlashEvents/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
});

test('D11 RSVP uses explicit persistent join and cancel RPCs, never a toggle', () => {
  assert.match(events, /\.rpc\(join \? 'join_flash_event' : 'cancel_flash_event_rsvp'/);
  assert.match(events, /\.from\(['"]flash_event_rsvps['"]\)/);
  assert.doesNotMatch(events, /\.rpc\(['"]rsvp_flash_event['"]\)/);
});
test('D06 queries real vq_transactions table correctly', () => {
  assert.match(purse, /\.from\(['"]vq_transactions['"]\)/);
  assert.doesNotMatch(purse, /\.from\(['"]vq_ledger['"]\)/);
  assert.match(purse, /fetchUserTransactions/);
});

test('Purse displays transaction ledger history or error state correctly', () => {
  assert.match(purseTab, /setHistoryError\(res\.error\)/);
  assert.match(purseTab, /historyError \? \(/);
  assert.match(purseTab, /Transaction ledger notice/);
});
