import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const studio = load('src/components/CurateTrailModal.tsx');
const gallery = load('src/domains/d07_trails/gallery.ts');
const api = load('src/domains/d07_trails/api.ts');
const explore = load('src/components/ExploreTab.tsx');

test('new Trail does not require adoption; photo publishing fails explicitly when DB is not installed', () => {
  assert.match(studio, /forkedFromTrailId: sourceTrailId \|\| undefined/);
  assert.match(studio, /if \(photoFiles\.length\) \{[\s\S]*?await requireTrailGallery\(\)/);
  assert.match(gallery, /\.select\('id,trail_id,object_path,sort_order,is_cover,created_at'\)\.limit\(1\)/);
  assert.match(studio, /role="alert"/);
  assert.match(studio, /setPublishError\(message\)/);
  assert.match(studio, /Trail was not published/);
  assert.match(api, /if \(payload\.forkedFromTrailId\)/);
  assert.match(api, /supabase\.from\('vibe_trails'\)\.insert\(body\)/);
});

test('multi-feature reconciliation retains Local Legend creation and removes map fly-to handler', () => {
  assert.match(explore, /Create Local Legend/);
  assert.match(explore, /initialGuardianType=\{guardianRegistrationType\}/);
  assert.doesNotMatch(explore, /handleStartTrailNav/);
});
