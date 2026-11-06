import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gallery = readFileSync(new URL('../src/domains/d07_trails/gallery.ts', import.meta.url), 'utf8');
const explore = readFileSync(new URL('../src/components/ExploreTab.tsx', import.meta.url), 'utf8');

test('existing Trails survive a missing or incomplete gallery schema', () => {
  assert.match(gallery, /error\.code === '42P01'/);
  assert.match(gallery, /error\.code === 'PGRST205'/);
  assert.match(gallery, /error\.code === '42703'/);
  assert.match(gallery, /column .* does not exist/);
  assert.match(gallery, /return trails;/);
  assert.match(gallery, /throw new Error\('Could not retrieve Trail galleries:/);
});

test('Explore loads Trails and Guardians independently of failed requests', () => {
  assert.match(explore, /Promise\.allSettled\(\[/);
  assert.doesNotMatch(explore, /Promise\.all\(\[\s*fetchNearbyVibePlaces/);
  assert.match(explore, /if \(trailsResult\.status === 'fulfilled'\)/);
  assert.match(explore, /if \(guardiansResult\.status === 'fulfilled'\) setGuardians\(guardiansResult\.value\)/);
  assert.match(explore, /if \(placesResult\.status === 'fulfilled'\) setPlaces\(placesResult\.value\)/);
  assert.match(explore, /if \(cancelled\) return/);
  assert.match(explore, /return \(\) => \{ cancelled = true; \}/);
});
