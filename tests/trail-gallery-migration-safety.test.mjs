import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261106160000_trail_media_gallery.sql', import.meta.url),
  'utf8',
);

test('gallery migration preserves the existing bigint identity primary key', () => {
  assert.match(sql, /id bigint generated always as identity primary key/);
  assert.match(sql, /create table if not exists public\.trail_media/);
  assert.doesNotMatch(sql, /\bdrop table\b|\btruncate\b|\bdelete from public\.trail_media\b/i);
});

test('legacy rows with missing real ownership or Storage path are rejected before NOT NULL', () => {
  const guard = sql.indexOf('do $legacy_gallery_guard$');
  const notNull = sql.indexOf('alter column trail_id set not null');
  assert.ok(guard >= 0 && notNull > guard);
  assert.match(sql, /owner_auth_user_id is null/);
  assert.match(sql, /nullif\(btrim\(object_path\), ''\) is null/);
  assert.match(sql, /raise exception 'Cannot migrate incomplete trail_media records/);
});

test('API grants are column-scoped and write rules remain owner-scoped', () => {
  assert.match(sql, /grant select\(id, trail_id, object_path, sort_order, is_cover, created_at\)/);
  assert.match(sql, /grant insert\(trail_id, object_path, sort_order, is_cover\)/);
  assert.match(sql, /grant update\(sort_order, is_cover\)/);
  assert.match(sql, /owner_auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /o\.owner_id = v_uid::text/);
});

test('migration recreates existing policies and triggers without duplicates', () => {
  for (const name of [
    'trail_media_public_read',
    'trail_media_owner_insert',
    'trail_media_owner_update',
    'trail_media_owner_delete',
    'vq_trail_attached_media_read',
    'vq_trail_unattached_media_owner_delete',
  ]) {
    assert.ok(sql.includes('drop policy if exists ' + name));
    assert.ok(sql.includes('create policy ' + name));
  }
  for (const name of [
    'vq_trail_media_guard_trigger',
    'vq_trail_media_legacy_cover_guard_trigger',
  ]) {
    assert.ok(sql.includes('drop trigger if exists ' + name));
    assert.ok(sql.includes('create trigger ' + name));
  }
});
