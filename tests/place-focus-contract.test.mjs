import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const card = readFileSync(new URL('../src/components/AddPlaceCard.tsx', import.meta.url), 'utf8');
const explore = readFileSync(new URL('../src/components/ExploreTab.tsx', import.meta.url), 'utf8');
test('selection triggers camera focus only after a validated OSM candidate', () => {
  const selection = card.split('const chooseOsmCandidate = async')[1]?.split('// The ZIP')[0] ?? '';
  assert.match(selection, /readOsmPlaceDetails\(/);
  assert.match(selection, /onUpdateDraftCoords\(\{ lat: candidateLat, lng: candidateLng \}\);/);
  assert.match(selection, /onFocusDraftCoords\?\.\(\{ lat: candidateLat, lng: candidateLng \}\);/);
});
test('camera uses MapLibre longitude-latitude order', () => {
  assert.match(explore, /onFocusDraftCoords=\{\(\{ lat, lng \}\) => \{[\s\S]*?map\.flyTo\(\{[\s\S]*?center: \[lng, lat\]/);
});
