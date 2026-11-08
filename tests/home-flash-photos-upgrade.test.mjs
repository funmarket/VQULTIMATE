import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/components/HomeTab.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/domains/d11_events/api.ts', import.meta.url), 'utf8');

test('Flash card keeps a real-photo suggestion slot but does not fake a live event', () => {
  assert.match(home, /places\.find\(place => Boolean\(place\.image_url\)\)/);
  assert.match(home, /alt=\{featuredPlace\.title\}/);
  assert.match(home, /Suggested place/);
  assert.match(home, /No Flash Events are active right now\./);
  assert.match(home, /\{hasActiveFlash \? \(/);
});

test('Create Flash button is available as an upgrade entry point for regular users', () => {
  assert.match(home, /\+ CREATE FLASH/);
  assert.match(home, /setIsFlashUpgradeOpen\(true\)/);
  assert.match(home, /Upgrade to Pro or Business/);
  assert.match(home, /Pro account/);
  assert.match(home, /Business account/);
});

test('Pro and Business labels do not bypass the verified backend authorization', () => {
  assert.match(home, /accountType/);
  assert.match(home, /canCreateFlash/);
  assert.match(home, /Flash Event publishing is not yet enabled for this account/);
  assert.match(api, /if \(!(await canCreateFlashEvent\(\))\)/);
  assert.match(api, /vq_admin_assignments/);
  assert.doesNotMatch(home, /accountType === 'pro' \? setIsCreateFlashOpen/);
});
