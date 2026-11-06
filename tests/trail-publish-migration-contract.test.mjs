import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const studio = load('src/components/CurateTrailModal.tsx');
const sql = load('supabase/migrations/20261106160000_trail_media_gallery.sql');
const api = load('src/domains/d07_trails/api.ts');
const explore = load('src/components/ExploreTab.tsx');

test('new Trail does not require adoption; photo publishing fails explicitly when DB is not installed', () => {
  assert.match(studio, /forkedFromTrailId: sourceTrailId \|\| undefined/);
  assert.match(studio, /if \(photoFiles\.length\) \{[\s\S]*?await requireTrailGallery\(\)/);
  assert.match(studio, /role="alert"/);
  assert.match(studio, /setPublishError\(message\)/);
  assert.match(studio, /Trail was not published/);
  assert.match(api, /if \(payload\.forkedFromTrailId\)/);
  assert.match(api, /supabase\.from\('vibe_trails'\)\.insert\(body\)/);
});

test('proposed gallery migration has balanced PostgreSQL PL/pgSQL delimiters', () => {
  assert.equal((sql.match(/as \$\$/g) || []).length, 2);
  assert.equal((sql.match(/^\$\$;/gm) || []).length, 2);
  assert.doesNotMatch(sql, /as \$\s*declare/);
  assert.doesNotMatch(sql, /\n\$;\s*create trigger/);
});

test('multi-feature reconciliation retains Local Legend creation and removes map fly-to handler', () => {
  assert.match(explore, /Create Local Legend/);
  assert.match(explore, /initialGuardianType=\{guardianRegistrationType\}/);
  assert.doesNotMatch(explore, /handleStartTrailNav/);
});
