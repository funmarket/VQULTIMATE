import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const frontend=readFileSync(new URL('src/components/AddPlaceCard.tsx',root),'utf8');
const client=readFileSync(new URL('src/domains/places/resolver.ts',root),'utf8');
const backend=readFileSync(new URL('server/placeService.mjs',root),'utf8');
const api=readFileSync(new URL('server/vercelPlaceApi.mjs',root),'utf8');
test('AddPlaceCard uses only the original resolver, never direct Nominatim single-result geocoding',()=>{
 assert.match(frontend,/resolvePlaceLink\(/);
 assert.doesNotMatch(frontend,/nominatim\.openstreetmap\.org/);
 assert.match(frontend,/lookupCandidates\.map/);
 assert.match(frontend,/chooseOsmCandidate/);
 assert.match(frontend,/matchWarning/);
 assert.match(frontend,/readOsmPlaceDetails/);
});
test('read-only API has all three prototype actions and retains exact backend module',()=>{
 assert.match(client,/\/api\/places\/\$\{action\}/);
 assert.match(client,/\x27resolve\x27\|\x27details\x27\|\x27photos\x27/);
 assert.match(api,/resolvePlaceInput/);assert.match(api,/getPlaceDetails/);assert.match(api,/searchCommonsImages/);
 assert.match(backend,/api\.allorigins\.win/);
 assert.match(backend,/api\.microlink\.io/);
 assert.match(backend,/photon\.komoot\.io/);
});
test('photo remains optional; Commons options require user selection',()=>{
 assert.match(frontend,/searchLicensedPlacePhotos/);
 assert.match(frontend,/Wikimedia Commons photo choices/);
 assert.match(frontend,/Preview this image/);
 assert.match(frontend,/selectedOsmRef/);
 assert.match(frontend,/Photo is strictly optional/);
});
