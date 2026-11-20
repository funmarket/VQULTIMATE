import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const { transformSync } = require('esbuild');
const source = readFileSync(new URL('../supabase/functions/nearby-places/index.ts', import.meta.url), 'utf8');
const js = transformSync(source, { loader: 'ts', target: 'es2022', format: 'cjs' }).code;
const row = (id, name, category, lat, lng) => ({ id, name, category, lat, lng, image_url: null, description: null });
const entries = [row('1', 'Near cafe', 'Food', 0.002, 0), row('2', 'Far park', 'Spots', 1, 0), row('3', 'Gallery', 'Art', 0.01, 0), row('4', 'Not leisure', 'Bank', 0, 0)];
function fixture(rows, status = 200) {
  let handler;
  const calls = [];
  const Deno = {
    env: { get(key) { return ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-anon' })[key]; } },
    serve(fn) { handler = fn; }
  };
  const fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push({ url, headers: options?.headers });
    if (status !== 200) return new Response('error', { status });
    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    return Response.json(rows.slice(offset, offset + limit));
  };
  runInNewContext(js, { Deno, fetch, Request, Response, URL, Set, Number, Math, console });
  assert.equal(typeof handler, 'function');
  return { handler, calls };
}
function request(category = 'All', lat = 0, lng = 0) {
  return new Request('https://example.supabase.co/functions/v1/nearby-places', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng, category })
  });
}
test('published leisure locations are nearest-first with no 23 km restriction', async () => {
  const { handler, calls } = fixture(entries);
  const response = await handler(request());
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.places.map(x => x.id), ['1', '3', '2']);
  assert.ok(data.places[2].distance_meters > 23000);
  assert.equal(data.places[0].title, 'Near cafe');
  assert.equal(data.places[0].image_url, '');
  assert.equal(data.source, 'community_places');
  assert.equal(calls[0].headers.apikey, 'public-anon');
  assert.equal(calls[0].url.pathname, '/rest/v1/places');
});
test('requested category is applied without a radius limit', async () => {
  const { handler } = fixture(entries);
  const response = await handler(request('Food'));
  assert.deepEqual((await response.json()).places.map(x => x.id), ['1']);
});
test('paginated catalogue is read across page boundary', async () => {
  const rows = Array.from({ length: 1002 }, (_, i) => row(String(i + 1), 'Venue', 'Spots', 0.001 * i, 0));
  const { handler, calls } = fixture(rows);
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.equal((await result.json()).places.length, 1002);
  assert.equal(calls.length, 2);
});
test('provider errors are surfaced, not represented as empty successful search', async () => {
  const { handler } = fixture(entries, 503);
  const result = await handler(request());
  assert.equal(result.status, 500);
  const data = await result.json();
  assert.match(data.error, /503/);
});
test('invalid coordinates are rejected before data fetch', async () => {
  const { handler, calls } = fixture(entries);
  const result = await handler(request('All', 99, 0));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
