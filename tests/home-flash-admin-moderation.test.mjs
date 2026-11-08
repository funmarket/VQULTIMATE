import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const participation = read('src/domains/d11_events/participation.ts');
const admin = read('src/components/AdminModal.tsx');
const sql = read('supabase/migrations/20261108044000_d11_rsvp_suggestions.sql');
test('admin reads pending suggestions through authenticated D11 domain API, not unscoped browser query',()=>{
 assert.match(participation,/export async function fetchPendingVibeSuggestions/);
 assert.match(participation,/supabase\.auth\.getUser\(\)/);
 assert.match(participation,/vq_admin_assignments/);
 assert.match(participation,/\.eq\('role', 'platform_admin'\)/);
 assert.match(participation,/\.eq\('active', true\)/);
 assert.match(participation,/\.from\('vibe_suggestion_submissions'\)/);
 assert.match(participation,/\.eq\('status', 'pending'\)/);
 assert.match(participation,/\.limit\(50\)/);
});
test('read-only admin queue renders genuine pending suggestion fields and honest empty/error states',()=>{
 assert.match(admin,/fetchPendingVibeSuggestions\(\)/);
 assert.match(admin,/Vibe suggestions awaiting review/);
 assert.match(admin,/No pending Vibe suggestions/);
 assert.match(admin,/item\.title/);
 assert.match(admin,/item\.description/);
 assert.match(admin,/item\.category/);
 assert.doesNotMatch(admin,/approveSuggestion|rejectSuggestion|setSuggestionApproved/);
});
test('database grants admin read without client update or deletion',()=>{
 assert.match(sql,/d11_suggestion_admin_read/);
 assert.doesNotMatch(sql,/grant (?:update|delete).*vibe_suggestion_submissions to authenticated/);
});
