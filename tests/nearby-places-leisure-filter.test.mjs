import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const edgeSource = readFileSync(new URL('../supabase/functions/nearby-places/index.ts', import.meta.url), 'utf8');
const begin = edgeSource.indexOf('const ALLOWED_LEISURE_TYPES');
const end = edgeSource.indexOf('function calculateHaversineMeters', begin);
assert.ok(begin >= 0 && end > begin, 'leisure filtering code must remain testable');
const snippet = edgeSource.slice(begin, end);
const compiled = transformSync(snippet, { loader: 'ts', target: 'es2022' }).code;
const { QUERY_TYPES, isStrictlyLeisurePlace, mapGoogleTypesToCategory } =
  vm.runInNewContext(compiled + '\n({ QUERY_TYPES, isStrictlyLeisurePlace, mapGoogleTypesToCategory })');

const venue = (name, types) => ({
  name, types, place_id: 'test-only',
  geometry: { location: { lat: 36.8065, lng: 10.1815 } }
});

test('exact category to Google type mapping', () => {
  assert.deepEqual(Array.from(QUERY_TYPES.Food), ['restaurant','cafe','bakery']);
  assert.deepEqual(Array.from(QUERY_TYPES['Night Owl']), ['bar','night_club']);
  assert.deepEqual(Array.from(QUERY_TYPES.Art), ['art_gallery']);
  assert.deepEqual(Array.from(QUERY_TYPES.Culture), ['museum','movie_theater']);
  assert.deepEqual(Array.from(QUERY_TYPES.Spots), ['tourist_attraction','park','spa']);
  assert.deepEqual(Array.from(QUERY_TYPES.All), [
    'restaurant','cafe','bar','night_club','lounge','bakery','art_gallery','museum',
    'movie_theater','tourist_attraction','park','spa','amusement_park'
  ]);
});

test('non-leisure names rejected even when Google includes a leisure type', () => {
  for (const name of [
    'Ibn Abi Dhiaf Secondary School', 'Institute of Press and Information',
    'Société CROWN MAGHREB', 'Manouba Civil Protection', 'Marquardt Tunisia',
    'École primaire', 'Immeuble Central', 'Company Office', 'Hospital Pharmacy', 'HAKING TELEWIN co'
  ]) {
    assert.equal(isStrictlyLeisurePlace(venue(name, ['tourist_attraction','point_of_interest'])), false, name);
  }
});

test('excluded types trump leisure types', () => {
  for (const type of ['school', 'university', 'bank', 'hospital', 'pharmacy', 'store', 'local_government_office']) {
    assert.equal(isStrictlyLeisurePlace(venue('Generic Venue', ['cafe', type])), false, type);
  }
});

test('genuine leisure venues survive and are categorized correctly', () => {
  for (const [name, type, category] of [
    ['Le Café', 'cafe', 'Food'],
    ['Garden Park', 'park', 'Spots'],
    ['Modern Art', 'art_gallery', 'Art'],
    ['City Museum', 'museum', 'Culture'],
    ['Night Bar', 'bar', 'Night Owl']
  ]) {
    const p = venue(name, [type, 'establishment']);
    assert.equal(isStrictlyLeisurePlace(p), true, name);
    assert.equal(mapGoogleTypesToCategory(p.types, 'All'), category);
  }
  assert.equal(isStrictlyLeisurePlace(venue('Generic Building', ['point_of_interest'])), false);
});

test('no invented community metrics in Google Places response mapping', () => {
  for (const claim of ['checkins_count:', 'vibe_confidence:', 'confirmations_count:', 'ai_match_score:', 'vq_reward:', 'pulse_intensity:']) {
    assert.equal(edgeSource.includes(claim), false, claim);
  }
  assert.match(edgeSource, /types: item\.types/);
  assert.match(edgeSource, /photo_reference=/);
});
