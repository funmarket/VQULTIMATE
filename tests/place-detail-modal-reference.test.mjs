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
  assert.match(modalContent, /CAFÉS/, 'Must render category pill including CAFÉS');
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
  assert.match(modalContent, /OpenStreetMap/, 'Must state location has been mapped on OpenStreetMap');
  assert.match(modalContent, /Verified by VibeQuest community nodes/, 'Must include VibeQuest community nodes verification');

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

test('Google Places Edge Function and d03 public API enforce real places with zero hardcoded mocks', () => {
  // 1. Edge Function exists and holds the Google Places API key securely
  const edgeFunctionPath = resolve('supabase/functions/nearby-places/index.ts');
  const edgeContent = readFileSync(edgeFunctionPath, 'utf8');
  assert.match(edgeContent, /GOOGLE_PLACES_API_KEY/, 'Edge function must read GOOGLE_PLACES_API_KEY from environment');
  assert.match(edgeContent, /maps\.googleapis\.com\/maps\/api\/place\/nearbysearch\/json/, 'Edge function must call Google Places Nearby Search');
  assert.match(edgeContent, /photo_reference/, 'Edge function must support secure photo proxying');

  // 2. d03 domain api calls Edge Function and has NO hardcoded place arrays
  const d03ApiPath = resolve('src/domains/d03_vibe_orbit/api.ts');
  const d03Content = readFileSync(d03ApiPath, 'utf8');
  assert.match(d03Content, /fetchNearbyPlaces/, 'd03 must export fetchNearbyPlaces');
  assert.match(d03Content, /supabase\.functions\.invoke\('nearby-places'/, 'Must invoke nearby-places Edge Function');
  assert.doesNotMatch(d03Content, /CANONICAL_PO_PLACES/, 'Must not contain hardcoded CANONICAL_PO_PLACES array');
  assert.match(d03Content, /calculateDistanceMeters/, 'Must compute distance using Haversine');

  // 3. d03 index.ts exports public API
  const d03IndexPath = resolve('src/domains/d03_vibe_orbit/index.ts');
  const d03IndexContent = readFileSync(d03IndexPath, 'utf8');
  assert.match(d03IndexContent, /export \* from '\.\/api'/, 'index.ts must export domain API');
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
