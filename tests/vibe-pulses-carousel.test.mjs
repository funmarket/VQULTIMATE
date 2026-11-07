import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('VibePulsesCarousel component satisfies reference visual and behavioral contracts', () => {
  const carouselPath = resolve('src/components/VibePulsesCarousel.tsx');
  const carouselContent = readFileSync(carouselPath, 'utf8');

  // 1. Title and Subtitle matching reference
  assert.match(carouselContent, /Vibe Pulses/, 'Must render title "Vibe Pulses"');
  assert.match(carouselContent, /Your city's social pulse/, 'Must render subtitle "Your city\'s social pulse"');

  // 2. Pulse wave iconography
  assert.match(carouselContent, /PulseWaveIcon|d="M3 12H7L9\.5 5L14\.5 19L17 12H21"/, 'Must render pulse wave SVG icon');

  // 3. Active card emphasis and dimensions
  assert.match(carouselContent, /ring-2 ring-purple-400/, 'Active card must feature illuminated glowing purple ring');
  assert.match(carouselContent, /scale-100/, 'Active card must have scale emphasis');
  assert.match(carouselContent, /scale-95/, 'Side cards must have scaled down preview styling');

  // 4. View Map navigation button
  assert.match(carouselContent, /View Map/, 'Must render View Map buttons');
  assert.match(carouselContent, /bg-gradient-to-r from-purple-500 to-pink-400/, 'Active card must display gradient View Map button');

  // 5. Weekend badge
  assert.match(carouselContent, /isWeekendHighlight/, 'Must support weekend highlight condition');
  assert.match(carouselContent, /This Weekend/, 'Must support This Weekend badge text');

  // 6. Manual navigation controls (< [dots] >)
  assert.match(carouselContent, /ChevronLeft/, 'Must provide previous button');
  assert.match(carouselContent, /ChevronRight/, 'Must provide next button');
  assert.match(carouselContent, /aria-label="City carousel indicators"/, 'Must provide indicator dots');

  // 7. Aggregate Summary Banner
  assert.match(carouselContent, /nearby/i, 'Must display aggregate cities count');
  assert.match(carouselContent, /total live vibes/, 'Must display total live vibes summary');

  // 8. Auto-scroll lifecycle & cleanup
  assert.match(carouselContent, /setInterval/, 'Must implement auto-advance timer');
  assert.match(carouselContent, /clearInterval/, 'Must clear interval on cleanup');
  assert.match(carouselContent, /clearTimeout/, 'Must clean up resume timer');

  // 9. Pause during interaction & touch swipe
  assert.match(carouselContent, /onMouseEnter=\{pauseAutoScroll\}/, 'Must pause auto-advance on mouse hover');
  assert.match(carouselContent, /handleTouchStart/, 'Must capture touch start for swipe gestures');
  assert.match(carouselContent, /handleTouchEnd/, 'Must process swipe delta on touch end');

  // 10. Accessibility & reduced motion
  assert.match(carouselContent, /prefers-reduced-motion/, 'Must respect prefers-reduced-motion media query');

  // 11. Single card stability
  assert.match(carouselContent, /cities\.length <= 1/, 'Must prevent meaningless auto-scrolling on single card');

  // 12. Empty state handling
  assert.match(carouselContent, /No active pulses in this sector/, 'Must display honest empty state when no cities available');
});

test('HomeTab cleanly integrates VibePulsesCarousel and removes obsolete activity feed presentation', () => {
  const homeTabPath = resolve('src/components/HomeTab.tsx');
  const homeTabContent = readFileSync(homeTabPath, 'utf8');

  // 1. Integrated VibePulsesCarousel
  assert.match(homeTabContent, /<VibePulsesCarousel/, 'HomeTab must render VibePulsesCarousel');
  assert.match(homeTabContent, /fetchCityPulses/, 'HomeTab must query city pulses through D04');

  // 2. Old High-Intensity Vibe Pulses section replaced
  assert.doesNotMatch(homeTabContent, /High-Intensity Vibe Pulses/, 'Old High-Intensity Vibe Pulses must be replaced');

  // 3. Obsolete Live District Activity Feed presentation removed from HomeTab
  assert.doesNotMatch(homeTabContent, /Live District Activity Feed/, 'Live District Activity Feed section must be removed from HomeTab');

  // 4. Legitimate social feed & cultural trails preserved
  assert.match(homeTabContent, /<HomeSocialFeed/, 'HomeSocialFeed must remain preserved');
  assert.match(homeTabContent, /Cultural Vibes Trails & Tours/, 'Cultural Trails section must remain preserved');
  assert.match(homeTabContent, /Active Guardians & Local Legends/, 'Active Guardians section must remain preserved');
});

test('D04 geo-presence city pulse API computes genuine aggregations and sorts by proximity', () => {
  const d04ApiPath = resolve('src/domains/d04_geo_presence/api.ts');
  const d04Content = readFileSync(d04ApiPath, 'utf8');

  // Baseline cities
  assert.match(d04Content, /Tunis/, 'Must include Tunis');
  assert.match(d04Content, /Carthage/, 'Must include Carthage');
  assert.match(d04Content, /La Marsa/, 'Must include La Marsa');
  assert.match(d04Content, /Sidi Bou Said/, 'Must include Sidi Bou Said');
  assert.match(d04Content, /Ariana/, 'Must include Ariana');

  // Baseline pulse counts
  assert.match(d04Content, /activePulses:\s*128/, 'Tunis baseline must be 128 active pulses');
  assert.match(d04Content, /activePulses:\s*92/, 'Carthage baseline must be 92 live vibes');
  assert.match(d04Content, /activePulses:\s*87/, 'La Marsa baseline must be 87 live vibes');
  assert.match(d04Content, /activePulses:\s*103/, 'Sidi Bou Said baseline must be 103 active pulses');
  assert.match(d04Content, /activePulses:\s*64/, 'Ariana baseline must be 64 active pulses');

  // Proximity sorting logic
  assert.match(d04Content, /calculateDistanceMeters/, 'Must calculate distance using Haversine');
  assert.match(d04Content, /distanceKm/, 'Must calculate distance in km');
  assert.match(d04Content, /sort\(/, 'Must sort nearest cities first');

  // Weekend logic
  assert.match(d04Content, /isWeekendNow/, 'Must provide isWeekendNow function');

  // Extensible type verification in types.ts
  const d04TypesPath = resolve('src/domains/d04_geo_presence/types.ts');
  const d04Types = readFileSync(d04TypesPath, 'utf8');
  assert.match(d04Types, /promotional_ad/, 'Extensible card type must be supported');
  assert.match(d04Types, /adData\?:/, 'Must include adData for future advertising compatibility');
});
