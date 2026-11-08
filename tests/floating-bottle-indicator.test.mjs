import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('DriftFloatingBottleIndicator component satisfies reference visual and accessibility contracts', () => {
  const indicatorPath = resolve('src/components/drift/DriftFloatingBottleIndicator.tsx');
  const content = readFileSync(indicatorPath, 'utf8');

  assert.match(content, /\/assets\/aistudio\/vibe_message_bottle_d7f0607e\.png/, 'Must reference the authoritative bottle image asset via public root /assets path');
  assert.match(content, /Open Message in a Bottle/, 'Must have accessible label for screen readers');
  assert.match(content, /bottleCount <= 0/, 'Must hide when no active bottles exist');
  assert.match(content, /prefersReducedMotion/, 'Must support accessibility motion preferences');
  assert.match(content, /StarSparkle/, 'Must render star sparkles of different sizes');
  assert.doesNotMatch(content, /border border-teal-500/, 'Must not have outer circular border container');
});

test('DriftRoomView integrates DriftFloatingBottleIndicator and wires bottle modal state', () => {
  const roomViewPath = resolve('src/components/drift/DriftRoomView.tsx');
  const content = readFileSync(roomViewPath, 'utf8');

  assert.match(content, /DriftFloatingBottleIndicator/, 'DriftRoomView must render DriftFloatingBottleIndicator');
  assert.match(content, /fetchFloatingBottles/, 'Must fetch floating bottles for active room');
  assert.match(content, /setBottleModalOpen\(true\)/, 'Tapping bottle indicator must open the existing Message in a Bottle menu');
});
