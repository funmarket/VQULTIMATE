import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const events = readFileSync(new URL('../src/domains/d11_events/api.ts', import.meta.url), 'utf8');
const purse = readFileSync(new URL('../src/domains/d06_purse/api.ts', import.meta.url), 'utf8');
const purseTab = readFileSync(new URL('../src/components/PurseTab.tsx', import.meta.url), 'utf8');

test('D11 retains fail-closed feature gating and never fabricates active events', () => {
  assert.doesNotMatch(events, /\.rpc\(['"]get_active_flash_event['"]\)/);
  assert.doesNotMatch(events, /CANONICAL_FLASH_EVENT|Secret Pop-up Gallery/);
  assert.match(events, /VITE_D11_FLASH_EVENTS_ENABLED/);
  assert.match(events, /if \(!eventsEnabled\) return null/);
  assert.match(events, /Promise<FlashEvent \| null>/);
  assert.match(events, /\.from\('flash_events'\)/);
  assert.match(events, /success: false/);
});

test('D06 does not call missing transaction table or expose legacy ledger before access review', () => {
  assert.doesNotMatch(purse, /\.from\(['"]vq_transactions['"]\)/);
  assert.doesNotMatch(purse, /\.from\(['"]vq_ledger['"]\)/);
  assert.match(purse, /transactions: \[\]/);
  assert.match(purse, /error: 'Transaction history is temporarily unavailable/);
});

test('Purse displays an error instead of reporting a failed lookup as an empty ledger', () => {
  assert.match(purseTab, /setHistoryError\(result\.error\)/);
  assert.match(purseTab, /historyError \? \(/);
  assert.match(purseTab, /Transaction history unavailable/);
  assert.match(purseTab, /if \(!active\) return/);
});
