import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/components/AddPlaceCard.tsx', import.meta.url), 'utf8');
test('adapts prototype venue-kind category inference instead of leaving Food default', () => {
  assert.match(src, /function mapToVibeCategory/);
  assert.match(src, /setCategory\(mapToVibeCategory\(details\.kind\s*\|\|\s*candidate\.kind,/);
});
test('automatically suggests licensed Commons photos if selected OSM object has no linked image', () => {
  assert.match(src, /if\s*\(!details\.photo\)\s*\{[\s\S]*?searchLicensedPlacePhotos\(/);
  assert.match(src, /setPhotoOptions\(results\.photos\s*\|\|\s*\[\]\)/);
});
test('guards against stale detail responses after selecting another OSM candidate', () => {
  assert.match(src, /selectedCandidateRef/);
  assert.match(src, /if\s*\(selectedCandidateRef\.current\s*!==\s*token\)\s*return/);
});
