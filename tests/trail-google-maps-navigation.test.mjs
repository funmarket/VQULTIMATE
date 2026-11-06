import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTrailRoutePlan } from '../src/domains/d07_trails/navigation.ts';

const makeTrail = (stops) => ({
  id: 'test-route', title: 'Route', stops,
});
const stop = (index) => ({
  id: 'stop-' + index,
  name: 'Stop ' + index,
  address: 'Address ' + index + ', Tunis',
  vibeNote: '',
  timeOfDay: 'Flexible',
  durationMinutes: 20,
  lat: 36 + index / 100,
  lng: 10 + index / 100,
});

test('Walking route goes through all five stops without exceeding mobile waypoint limit', () => {
  const { segments, error } = buildTrailRoutePlan(makeTrail([1,2,3,4,5].map(stop)), 'walking');
  assert.equal(error, undefined);
  assert.equal(segments.length, 1);
  const url = new URL(segments[0].url);
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('travelmode'), 'walking');
  assert.equal(url.searchParams.get('origin'), 'Address 1, Tunis');
  assert.equal(url.searchParams.get('destination'), 'Address 5, Tunis');
  assert.equal(url.searchParams.get('waypoints')?.split('|').length, 3);
});

test('Long driving Trails split into contiguous, ordered Google Maps legs', () => {
  const { segments } = buildTrailRoutePlan(makeTrail([1,2,3,4,5,6,7].map(stop)), 'driving');
  assert.equal(segments.length, 2);
  assert.deepEqual(segments.map(s => [s.from, s.to]), [['Stop 1','Stop 5'], ['Stop 5','Stop 7']]);
  assert.equal(segments[1].stopCount, 3);
});

test('Transit routes each pair separately instead of inventing transit waypoints', () => {
  const { segments } = buildTrailRoutePlan(makeTrail([1,2,3].map(stop)), 'transit');
  assert.equal(segments.length, 2);
  assert.equal(new URL(segments[0].url).searchParams.get('waypoints'), null);
  assert.equal(new URL(segments[1].url).searchParams.get('travelmode'), 'transit');
});

test('Best leaves Google Maps travel mode unspecified', () => {
  const { segments } = buildTrailRoutePlan(makeTrail([1,2].map(stop)), 'best');
  assert.equal(segments.length, 1);
  assert.equal(new URL(segments[0].url).searchParams.get('travelmode'), null);
});

test('Address-only stops route without coordinates', () => {
  const addressOnly = [stop(1), stop(2), stop(3)].map(({lat, lng, ...rest}) => rest);
  const plan = buildTrailRoutePlan(makeTrail(addressOnly), 'walking');
  assert.equal(plan.error, undefined);
  assert.equal(plan.segments.length, 1);
  const url = new URL(plan.segments[0].url);
  assert.equal(url.searchParams.get('origin'), 'Address 1, Tunis');
  assert.equal(url.searchParams.get('destination'), 'Address 3, Tunis');
  assert.equal(url.searchParams.get('waypoints'), 'Address 2, Tunis');
});

test('Missing addresses block routing even when coordinates exist', () => {
  const noPosition = {...stop(2), address: ''};
  const invalid = buildTrailRoutePlan(makeTrail([stop(1), noPosition, stop(3)]), 'walking');
  assert.equal(invalid.segments.length, 0);
  assert.match(invalid.error, /Stop 2/);
  assert.equal(buildTrailRoutePlan(makeTrail([stop(1)]), 'driving').segments.length, 0);
  assert.equal(buildTrailRoutePlan(makeTrail([stop(1), {...stop(2), address: '', lng: 190}]), 'driving').segments.length, 0);
});

test('Four exact approved button labels and per-stop navigation appear in detail UI', () => {
  const detail = readFileSync(new URL('../src/components/TrailDetailModal.tsx', import.meta.url), 'utf8');
  const explore = readFileSync(new URL('../src/components/ExploreTab.tsx', import.meta.url), 'utf8');
  for (const label of ['Chill Walk', 'Cruise To It', 'Hop On', 'Best']) assert.ok(detail.includes(label));
  assert.match(detail, /grid grid-cols-4/);
  assert.match(detail, /Navigate to this stop in Google Maps/);
  assert.match(detail, /Your itinerary needs/);
  assert.doesNotMatch(detail, /FULL TRAIL WALKING ROUTE/);
  assert.doesNotMatch(explore, /handleStartTrailNav/);
});
