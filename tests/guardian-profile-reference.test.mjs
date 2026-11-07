import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('GuardianDetailModal matches funmarket/VQgemini reference screenshots', () => {
  const modalPath = resolve('src/components/GuardianDetailModal.tsx');
  const modalContent = readFileSync(modalPath, 'utf8');

  // 1. Header Bar matching Screenshot 3
  assert.match(modalContent, /GUARDIAN PROFILE/, 'Modal header must display GUARDIAN PROFILE label');
  assert.match(modalContent, /PRO GUIDE/, 'Modal header must display PRO GUIDE badge for pro guardians');
  assert.match(modalContent, /LOCAL LEGEND/, 'Modal header must display LOCAL LEGEND badge for local guardians');

  // 2. Identity block matching Screenshot 3
  assert.match(modalContent, /APP SELFIE/, 'Selfie avatar must include APP SELFIE camera tag');
  assert.match(modalContent, /Verified Identity|fill-blue-500|text-blue-400/, 'Guardian name must show blue verified shield icon');
  assert.match(modalContent, /Rate:\s*(?:\{[^}]+\}|[^\n]+)/, 'Identity section must include rate pill');
  assert.match(modalContent, /HANDSHAKE/, 'Identity section must include HANDSHAKE button');
  assert.match(modalContent, /In-App Selfie Fresh/, 'Identity section must include In-App Selfie Fresh pill');

  // 3. About Section matching Screenshot 3
  assert.match(modalContent, /ABOUT THE GUARDIAN/, 'Modal must display ABOUT THE GUARDIAN section header');

  // 4. Pre-made Bookable Tours matching Screenshot 3 & 2
  assert.match(modalContent, /PRE-MADE BOOKABLE TOURS/, 'Modal must display PRE-MADE BOOKABLE TOURS section header');
  assert.match(modalContent, /Direct Reservation/, 'Modal must display Direct Reservation sub-label');
  assert.match(modalContent, /BOOK TOUR SLOT/, 'Tour cards must display prominent BOOK TOUR SLOT button');

  // 5. Handshake-Gated Reviews matching Screenshot 2
  assert.match(modalContent, /HANDSHAKE-GATED REVIEWS/, 'Modal must display HANDSHAKE-GATED REVIEWS section');
  assert.match(modalContent, /Max 111 chars/, 'Modal must display Max 111 chars constraint label');
  assert.match(modalContent, /Handshake required before reviews can be posted/, 'Reviews section must gate review posting when handshake is unconfirmed');

  // 6. Sticky Bottom Message Bar matching Screenshot 2
  assert.match(modalContent, /MESSAGE GUARDIAN/, 'Modal must display sticky bottom MESSAGE GUARDIAN button');

  // 7. Isolation from ordinary user ECHO / PULL actions
  assert.doesNotMatch(modalContent, /button[^>]*>\s*ECHO\s*<\/button>/i, 'GuardianDetailModal must never render ordinary user ECHO button');
  assert.doesNotMatch(modalContent, /button[^>]*>\s*PULL\s*<\/button>/i, 'GuardianDetailModal must never render ordinary user PULL button');
});

test('D22 Handshake domain enforces mutual acceptance workflow', () => {
  const handshakeApiPath = resolve('src/domains/d22_handshake/api.ts');
  const handshakeApi = readFileSync(handshakeApiPath, 'utf8');

  assert.match(handshakeApi, /initiateHandshake/, 'D22 must export initiateHandshake');
  assert.match(handshakeApi, /acceptHandshake/, 'D22 must export acceptHandshake');
  assert.match(handshakeApi, /declineHandshake/, 'D22 must export declineHandshake');
  assert.match(handshakeApi, /getHandshakeStatus/, 'D22 must export getHandshakeStatus');
  assert.match(handshakeApi, /hasCompletedHandshake/, 'D22 must export hasCompletedHandshake');
});

test('D19 Reviews domain enforces 111-character limit and Handshake gating', () => {
  const reviewsApiPath = resolve('src/domains/d19_reviews/api.ts');
  const reviewsApi = readFileSync(reviewsApiPath, 'utf8');

  assert.match(reviewsApi, /111/, 'D19 must enforce 111 character limit constraint');
  assert.match(reviewsApi, /hasCompletedHandshake/, 'D19 must check for completed handshake before submission');
  assert.match(reviewsApi, /submitGuardianReview/, 'D19 must export submitGuardianReview');
  assert.match(reviewsApi, /fetchGuardianReviews/, 'D19 must export fetchGuardianReviews');
});
