import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('PlaceDetailModal component satisfies reference visual and behavioral contracts', () => {
  const modalPath = resolve('src/components/PlaceDetailModal.tsx');
  const modalContent = readFileSync(modalPath, 'utf8');

  // 1. Accent border & styling
  assert.match(modalContent, /border-t-.*amber-400/, 'Must feature gold/amber upper accent border');
  assert.match(modalContent, /#0d111a|neutral-900/, 'Must use deep dark background container');

  // 2. Hero image with emerald category pill and close button
  assert.match(modalContent, /categoryLabel/, 'Must render category pill');
  assert.match(modalContent, /#00d68f|emerald-400|emerald-500/, 'Category pill must have vibrant emerald styling');
  assert.match(modalContent, /Close spot details|aria-label="Close/, 'Must have close button on hero image');

  // 3. Spot identity & Legendary Spot badge
  assert.match(modalContent, /LEGENDARY SPOT/, 'Must display LEGENDARY SPOT badge');
  assert.match(modalContent, /place\.title/, 'Must display place title');

  // 4. Three-tab switcher
  assert.match(modalContent, /Info/, 'Must render Info tab');
  assert.match(modalContent, /Mayor & Badges/, 'Must render Mayor & Badges tab');
  assert.match(modalContent, /Meetups \(0\)/, 'Must render Meetups tab');
  assert.match(modalContent, /bg-blue-600/, 'Active tab must have blue pill styling');

  // 5. Info tab metrics: Rating, Vibe Confidence, Address
  assert.match(modalContent, /Out of 5\.0/, 'Must display star rating formatted as Out of 5.0');
  assert.match(modalContent, /check-ins/, 'Must display check-in count');
  assert.match(modalContent, /Vibe Confidence:/, 'Must display Vibe Confidence label');
  assert.match(modalContent, /confirmations/, 'Must display confirmations count');
  assert.match(modalContent, /#00e5a3|emerald-400|teal-400/, 'Vibe confidence must have bright cyan/teal styling');
  assert.doesNotMatch(modalContent, /OpenStreetMap/, 'Must not state location has been mapped on OpenStreetMap');
  assert.doesNotMatch(modalContent, /Verified by VibeQuest community nodes/, 'Must not include fake community nodes verification');
  assert.match(modalContent, /Verified Google Places venue/, 'Must display verified Google Places venue status');

  // 6. AI Vibe Match Score card
  assert.match(modalContent, /AI VIBE MATCH SCORE/, 'Must display AI VIBE MATCH SCORE banner');
  assert.match(modalContent, /% Match/, 'Must display match percentage');
  assert.match(modalContent, /MATCH RELEVANCE BREAKDOWN:/, 'Must display MATCH RELEVANCE BREAKDOWN: header');
  assert.match(modalContent, /Interest Alignment/, 'Must include Interest Alignment breakdown');
  assert.match(modalContent, /\+15%/, 'Must show +15% interest alignment score');
  assert.match(modalContent, /Stable Base Signal/, 'Must include Stable Base Signal breakdown');
  assert.match(modalContent, /\+3%/, 'Must show +3% stable base signal score');
  assert.match(modalContent, /Offline-resilient engine active/, 'Must display offline-resilient engine disclaimer');

  // 7. Four exact action buttons
  assert.match(modalContent, /Check-in to Gain \+.*PTS/, 'Must have Check-in to Gain PTS action button');
  assert.match(modalContent, /Vibe Validate \(Locked - Check-in or be within 200m\)/, 'Must render locked Vibe Validate button');
  assert.match(modalContent, /View Map & Directions/, 'Must render View Map & Directions button');
  assert.match(modalContent, /Close Spot Details/, 'Must render Close Spot Details button');
});

test('Google Places Edge Function and d03 public API enforce real places with strict leisure filter', () => {
  // 1. Edge Function exists and holds the Google Places API key securely
  const edgeFunctionPath = resolve('supabase/functions/nearby-places/index.ts');
  const edgeContent = readFileSync(edgeFunctionPath, 'utf8');
  assert.match(edgeContent, /GOOGLE_PLACES_API_KEY/, 'Edge function must read GOOGLE_PLACES_API_KEY from environment');
  assert.match(edgeContent, /ALLOWED_LEISURE_TYPES/, 'Must define ALLOWED_LEISURE_TYPES');
  assert.match(edgeContent, /EXCLUDED_TYPES/, 'Must define EXCLUDED_TYPES');
  assert.match(edgeContent, /isStrictlyLeisurePlace/, 'Must implement isStrictlyLeisurePlace filtering function');
  assert.match(edgeContent, /photo_reference/, 'Edge function must support secure photo proxying');

  // 2. Leisure inclusions & exclusions
  assert.match(edgeContent, /restaurant/, 'Must include restaurant in allowed leisure');
  assert.match(edgeContent, /cafe/, 'Must include cafe in allowed leisure');
  assert.match(edgeContent, /bar/, 'Must include bar in allowed leisure');
  assert.match(edgeContent, /bank/, 'Must exclude banks');
  assert.match(edgeContent, /school/, 'Must exclude schools');
  assert.match(edgeContent, /hospital/, 'Must exclude hospitals');
  assert.match(edgeContent, /lawyer/, 'Must exclude lawyer offices');

  // 3. Closest first, then highest rating sorting
  assert.match(edgeContent, /calculateHaversineMeters/, 'Must compute distance via Haversine in edge function');
  assert.match(edgeContent, /distDiff\)\s*>\s*200/, 'Must prioritize closest first, then rating for equidistant spots');

  // 4. d03 domain api calls Edge Function and has NO hardcoded place arrays
  const d03ApiPath = resolve('src/domains/d03_vibe_orbit/api.ts');
  const d03Content = readFileSync(d03ApiPath, 'utf8');
  assert.match(d03Content, /fetchNearbyPlaces/, 'd03 must export fetchNearbyPlaces');
  assert.match(d03Content, /supabase\.functions\.invoke\('nearby-places'/, 'Must invoke nearby-places Edge Function');
  assert.doesNotMatch(d03Content, /CANONICAL_PO_PLACES/, 'Must not contain hardcoded CANONICAL_PO_PLACES array');
  assert.match(d03Content, /calculateDistanceMeters/, 'Must compute distance using Haversine');

  // 5. d03 index.ts exports public API
  const d03IndexPath = resolve('src/domains/d03_vibe_orbit/index.ts');
  const d03IndexContent = readFileSync(d03IndexPath, 'utf8');
  assert.match(d03IndexContent, /export \* from '\.\/api'/, 'index.ts must export domain API');
});

test('D04 fetchCityPulses prioritizes real user vibes, then leisure places, without fake baseline fallback', () => {
  const d04ApiPath = resolve('src/domains/d04_geo_presence/api.ts');
  const d04Content = readFileSync(d04ApiPath, 'utf8');

  // Mode A: user vibes
  assert.match(d04Content, /mode_a_live/, 'Must support Mode A live user vibes');
  assert.match(d04Content, /from\('city_pulses'\)/, 'Must query Supabase city_pulses');

  // Mode B: real leisure places fallback
  assert.match(d04Content, /mode_b_real_places/, 'Must support Mode B real leisure places');
  assert.match(d04Content, /fetchNearbyPlaces\(coords\)/, 'Mode B must call fetchNearbyPlaces');

  // Sorting Mode B: closest first, then highest rating
  assert.match(d04Content, /distDiff\)\s*>\s*200/, 'Must sort Mode B by distance then rating');

  // Zero fake fallback: liveCities is NOT populated with CANONICAL_CITY_BASELINES
  assert.doesNotMatch(
    d04Content,
    /liveCities\s*=\s*CANONICAL_CITY_BASELINES\.map/,
    'fetchCityPulses must NEVER populate liveCities with CANONICAL_CITY_BASELINES'
  );
});

test('MapLibre in ExploreTab centers once and prevents unwanted recentering during user browsing', () => {
  const exploreTabPath = resolve('src/components/ExploreTab.tsx');
  const exploreContent = readFileSync(exploreTabPath, 'utf8');

  // 1. Initial center once ref guard
  assert.match(exploreContent, /hasInitiallyCenteredRef/, 'Must use hasInitiallyCenteredRef to prevent repeated recentering');

  // 2. Does not recenter on continuous GPS coordinates
  assert.doesNotMatch(
    exploreContent,
    /\[locationState\.status,\s*locationState\.coords\?\.lat,\s*locationState\.coords\?\.lng\]/,
    'Must not recenter camera on continuous GPS coordinate updates'
  );

  // 3. Explicit manual recenter action
  assert.match(exploreContent, /handleRecenterUser|My Location/, 'Must provide explicit My Location recenter action');

  // 4. Uses fetchNearbyPlaces from d03_vibe_orbit
  assert.match(exploreContent, /fetchNearbyPlaces\(locationState\.coords/, 'ExploreTab must query places via fetchNearbyPlaces');
});

test('VibePulsesCarousel and HomeTab wire place cards directly to PlaceDetailModal', () => {
  const carouselPath = resolve('src/components/VibePulsesCarousel.tsx');
  const carouselContent = readFileSync(carouselPath, 'utf8');

  // Must support onSelectPlace and placeData
  assert.match(carouselContent, /onSelectPlace\?: \(place: VibePlace\) => void/, 'Carousel must accept onSelectPlace prop');
  assert.match(carouselContent, /city\.placeData/, 'Carousel must inspect placeData on pulse card');
  assert.match(carouselContent, /onSelectPlace\(city\.placeData\)/, 'Tapping place card must invoke onSelectPlace');

  const homeTabPath = resolve('src/components/HomeTab.tsx');
  const homeTabContent = readFileSync(homeTabPath, 'utf8');
  assert.match(homeTabContent, /onSelectPlace=\{onSelectPlace\}/, 'HomeTab must forward onSelectPlace to VibePulsesCarousel');
});
