import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const events = readFileSync(new URL('../src/domains/d11_events/api.ts', import.meta.url), 'utf8');
const purse = readFileSync(new URL('../src/domains/d06_purse/api.ts', import.meta.url), 'utf8');
const purseTab = readFileSync(new URL('../src/components/PurseTab.tsx', import.meta.url), 'utf8');

test('D11 does not call missing Flash Event endpoints or fabricate live events', () => {
  assert.doesNotMatch(events, /\.rpc\(['"]get_active_flash_event['"]\)/);
  assert.doesNotMatch(events, /\.from\(['"]flash_events['"]\)/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
  assert.match(events, /Promise<FlashEvent \| null>/);
  assert.match(events, /return null;/);
  assert.match(events, /success: false/);
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
