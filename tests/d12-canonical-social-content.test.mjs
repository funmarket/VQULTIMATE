import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

test('D12 exposes the single canonical social-content boundary', () => {
  assert.equal(existsSync(new URL('src/domains/d12_social_content/index.ts', root)), true,
    'D12 public index must exist');
  const api = source('src/domains/d12_social_content/api.ts');
  for (const table of ['social_posts', 'social_post_comments', 'social_post_reactions']) {
    assert.ok(api.includes(".from('" + table + "')"), 'D12 must own ' + table);
  }
});

test('Vibe uses D12 and does not manufacture a successful post', () => {
  const vibe = source('src/components/VibeTab.tsx');
  assert.match(vibe, /from ['"]\.\.\/domains\/d12_social_content['"]/);
  assert.doesNotMatch(vibe, /from ['"]\.\.\/domains\/d05_vibe['"]/);
  assert.doesNotMatch(vibe, /id: 'post_' \+ Date\.now\(\)/);
  assert.doesNotMatch(vibe, /reactions_count: 1\s*,\s*comments_count: 0/);
  assert.match(vibe, /await\s+createSocialPost\(/);
});

test('a failed post write does not erase the unsaved draft', () => {
  const vibe = source('src/components/VibeTab.tsx');
  assert.match(vibe, /if\s*\(result\.success\s*&&\s*result\.post\)/);
  assert.match(vibe, /result\.error/);
});
