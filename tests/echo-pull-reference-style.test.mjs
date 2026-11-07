import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync(new URL('../src/components/UserProfileCard.tsx', import.meta.url), 'utf8');

test('UserProfileCard matches reference ECHO/PULL styling and states', () => {
  assert.match(content, /font-mono text-xs font-black uppercase tracking-wider py-2\.5 px-4 rounded-xl border/g);
  assert.match(content, /border-emerald-500\/40 text-emerald-400 hover:bg-emerald-500\/10/);
  assert.match(content, /bg-emerald-500\/20 text-emerald-300 border-emerald-500\/60/);
  assert.match(content, /border-rose-500\/40 text-rose-300 hover:bg-rose-500\/10/);
  assert.match(content, /bg-rose-500\/20 text-rose-200 border-rose-500\/60/);
  for (const label of ['ECHO', 'ECHOED', 'PULL', 'PULLED']) {
    assert.ok(content.includes(`<span>${label}</span>`), `missing label ${label}`);
  }
  assert.doesNotMatch(content, /ECHO \(Follow\)|PULL \(Vibe\)|bg-gradient-to-r from-orange-500 to-teal-500/);
  assert.match(content, /onClick=\{handleEcho\}/);
  assert.match(content, /onClick=\{handlePull\}/);
  assert.match(content, /disabled=\{loading \|\| pullPending\}/);
  assert.match(content, /followUser\(|unfollowUser\(|sendConnectionPull\(/);
});
