import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url), 'utf8');

test('application shell stays viewport height like VQgemini', () => {
  assert.match(app, /h-\[100dvh\]/);
  assert.match(app, /flex flex-col/);
  assert.match(app, /overflow-hidden/);
  assert.doesNotMatch(app, /min-h-screen/);
});

test('main feed owns scrolling without stretching profile overlay', () => {
  assert.match(app, /ref=\{mainScrollRef\}/);
  assert.match(app, /flex-1 min-h-0 overflow-y-auto/);
  assert.match(app, /<ProfileModal/);
});

test('bottom navigation observes the feed scrolling and resets on tab changes', () => {
  assert.match(app, /scrollContainerRef=\{mainScrollRef\}/);
  assert.match(nav, /scrollContainerRef\?: React\.RefObject<HTMLElement \| null>/);
  assert.match(nav, /scrollContainerRef\?\.current \?\? window/);
  assert.match(nav, /scrollContainerRef\?\.current\?\.scrollTop \?\? window\.scrollY/);
  assert.match(nav, /\[activeTab\]/);
});
