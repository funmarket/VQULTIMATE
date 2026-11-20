import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/components/AddPlaceCard.tsx', import.meta.url), 'utf8');
test('D05 publication sends public.places.name and database-generated UUID', () => {
  const payload = source.split('const placePayload = {')[1]?.split('};')[0] ?? '';
  assert.match(payload, /name:\s*placeName\.trim\(\)/);
  assert.doesNotMatch(payload, /\bid\s*:/);
  assert.doesNotMatch(payload, /\btitle\s*:/);
  assert.match(source, /\.select\('id, name, created_by, lat, lng, image_url'\)/);
});
test('published database row is mapped to the VibePlace title interface', () => {
  assert.match(source, /onPlaceAdded\(\{\s*\.\.\.data,\s*title:\s*data\.name/);
  assert.match(source, /if\s*\(!data\s*\|\|\s*!data\.id\s*\|\|\s*data\.created_by\s*!==\s*user\.id\)/);
});
