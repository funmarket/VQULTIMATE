import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const studio = read('src/components/CurateTrailModal.tsx');
const api = read('src/domains/d07_trails/api.ts');
const gallery = read('src/domains/d07_trails/gallery.ts');
const detail = read('src/components/TrailDetailModal.tsx');
const sql = read('supabase/migrations/20261106160000_trail_media_gallery.sql');

test('the merged Stop Location input fix remains intact', () => {
  assert.match(studio, /const location = e\.currentTarget\.value/);
  assert.match(studio, /i === idx \? \{ \.\.\.item, name: location, address: location \} : item/);
  assert.doesNotMatch(studio, /handleUpdateStop\(idx, 'name', e\.target\.value\);\s*handleUpdateStop\(idx, 'address', e\.target\.value\)/);
});

test('creator selects validated photos and saves them through the D07 owner', () => {
  assert.match(studio, /validateTrailPhotos\(photoFiles, freePhotoSlots\)/);
  assert.match(studio, /await requireTrailGallery\(\)/);
  assert.match(studio, /await uploadTrailPhotos\(published\.id, photoFiles, coverPhotoIndex\)/);
  assert.match(gallery, /supabase\.storage\.from\('media'\)\.upload/);
  assert.match(gallery, /\.from\('trail_media'\)\.insert/);
  assert.match(gallery, /'image\/jpeg': 'jpg'/);
  assert.match(gallery, /'image\/webp': 'webp'/);
});

test('public gallery uses expiring read URLs but does not persist them as cover data', () => {
  assert.match(gallery, /createSignedUrl\(path, SIGNED_URL_SECONDS\)/);
  assert.match(api, /withTrailGalleries/);
  assert.match(api, /inheritedLegacyCover = String\(source\.image_url \|\| ''\)/);
  assert.match(detail, /aria-label="Trail photo gallery"/);
});

test('gallery schema restricts writes, paths, images and tier quota', () => {
  assert.match(sql, /create table if not exists public\.trail_media/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /owner_auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /only the Trail creator may edit/i);
  assert.match(sql, /v_uid::text \|\| '\/trails\/' \|\| new\.trail_id/);
  assert.match(sql, /v_size > 5242880/);
  assert.match(sql, /v_limit/);
  assert.match(sql, /v_legacy_cover/);
  assert.match(sql, /vq_trail_attached_media_read/);
});
