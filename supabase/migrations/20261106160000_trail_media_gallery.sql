-- VQUltimate D07 Trail/Tour media gallery. Review and apply after testing.
-- No existing Trail, Tour, profile, or Storage objects are rewritten.
-- Compatible with clean installations and existing bigint-identity tables.
-- Preserve existing rows; incomplete legacy rows cannot be assigned fabricated
-- authors, Trail links, or storage paths, so reject them explicitly.
create table if not exists public.trail_media (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);
alter table public.trail_media
  add column if not exists trail_id text,
  add column if not exists owner_auth_user_id uuid default auth.uid(),
  add column if not exists object_path text,
  add column if not exists sort_order integer default 0,
  add column if not exists is_cover boolean default false;
-- Stop before adding NOT NULL constraints if an older two-column installation
-- still holds rows with no verifiable Trail, owner, or storage association.
-- Existing records must be reconciled from real evidence, never auto-filled.
do $legacy_gallery_guard$
begin
  if exists (
    select 1 from public.trail_media
    where trail_id is null
       or owner_auth_user_id is null
       or nullif(btrim(object_path), '') is null
  ) then
    raise exception 'Cannot migrate incomplete trail_media records: reconcile real Trail, owner and object_path values first.'
      using errcode = '23502';
  end if;
end;
$legacy_gallery_guard$;

alter table public.trail_media
  alter column trail_id set not null,
  alter column owner_auth_user_id set default auth.uid(),
  alter column owner_auth_user_id set not null,
  alter column object_path set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null,
  alter column is_cover set default false,
  alter column is_cover set not null;
do $constraints$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.trail_media'::regclass and conname='trail_media_trail_id_fkey') then
    alter table public.trail_media add constraint trail_media_trail_id_fkey
      foreign key(trail_id) references public.vibe_trails(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.trail_media'::regclass and conname='trail_media_object_path_key') then
    alter table public.trail_media add constraint trail_media_object_path_key unique(object_path);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.trail_media'::regclass and conname='trail_media_sort_order_check') then
    alter table public.trail_media add constraint trail_media_sort_order_check check(sort_order >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.trail_media'::regclass and conname='trail_media_path_type') then
    alter table public.trail_media add constraint trail_media_path_type check(object_path ~* '\.(jpg|jpeg|png|webp)$');
  end if;
end;
$constraints$;

create index if not exists trail_media_trail_order_idx
  on public.trail_media(trail_id, sort_order, created_at);
create unique index if not exists trail_media_one_cover_per_trail
  on public.trail_media(trail_id) where is_cover = true;

alter table public.trail_media enable row level security;
revoke all on table public.trail_media from anon, authenticated;
grant select(id, trail_id, object_path, sort_order, is_cover, created_at)
  on public.trail_media to anon, authenticated;
grant insert(trail_id, object_path, sort_order, is_cover)
  on public.trail_media to authenticated;
grant update(sort_order, is_cover)
  on public.trail_media to authenticated;
grant delete on public.trail_media to authenticated;

drop policy if exists trail_media_public_read on public.trail_media;
create policy trail_media_public_read on public.trail_media
  for select to anon, authenticated using (true);
drop policy if exists trail_media_owner_insert on public.trail_media;
create policy trail_media_owner_insert on public.trail_media
  for insert to authenticated
  with check (owner_auth_user_id = (select auth.uid()));
drop policy if exists trail_media_owner_update on public.trail_media;
create policy trail_media_owner_update on public.trail_media
  for update to authenticated
  using (owner_auth_user_id = (select auth.uid()))
  with check (owner_auth_user_id = (select auth.uid()));
drop policy if exists trail_media_owner_delete on public.trail_media;
create policy trail_media_owner_delete on public.trail_media
  for delete to authenticated
  using (owner_auth_user_id = (select auth.uid()));

-- Reuse the existing author-identity aliases and do not grant all users
-- permission to alter each other's content.
create or replace function public.vq_trail_media_guard()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_author text;
  v_legacy_cover text;
  v_limit integer;
  v_is_admin boolean;
  v_prefix text;
  v_mime text;
  v_size bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required for Trail media' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.trail_id is distinct from old.trail_id
      or new.object_path is distinct from old.object_path
      or new.owner_auth_user_id is distinct from old.owner_auth_user_id then
      raise exception 'Trail media ownership is immutable' using errcode = '42501';
    end if;
  end if;
  select t.author_id, t.image_url into v_author, v_legacy_cover
    from public.vibe_trails t where t.id = new.trail_id for update;
  if not found then raise exception 'Trail not found' using errcode = '23503'; end if;
  if not (
    v_author = v_uid::text or v_author = 'usr_' || v_uid::text
    or exists (
      select 1 from public.s00_test_identity_links l
      where l.auth_user_id = v_uid and l.legacy_profile_id = v_author
    )
  ) then
    raise exception 'Only the Trail creator may edit its gallery' using errcode = '42501';
  end if;
  if new.owner_auth_user_id is distinct from v_uid then
    raise exception 'Media owner must match the authenticated user' using errcode = '42501';
  end if;
  v_prefix := v_uid::text || '/trails/' || new.trail_id || '/';
  if left(new.object_path, length(v_prefix)) <> v_prefix then
    raise exception 'Trail media must use the creator-owned Trail path' using errcode = '42501';
  end if;
  select o.metadata->>'mimetype', (o.metadata->>'size')::bigint
    into v_mime, v_size
    from storage.objects o
    where o.bucket_id = 'media' and o.name = new.object_path and o.owner_id = v_uid::text;
  if not found then
    raise exception 'Uploaded media object was not found' using errcode = '22023';
  end if;
  if v_mime not in ('image/jpeg', 'image/png', 'image/webp')
    or v_mime is null or v_size is null or v_size < 1 or v_size > 5242880 then
    raise exception 'Trail media must be a JPG, PNG or WebP image of at most 5 MB' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    select exists(
      select 1 from public.vq_admin_assignments a
      where a.auth_user_id = v_uid and a.active and a.role = 'platform_admin'
    ) into v_is_admin;
    select case
      when v_is_admin or coalesce(p.account_type, 'vibe') in ('pro', 'business') then 6
      else 3
    end into v_limit
    from public.profiles p where p.id = v_author;
    if v_limit is null then
      raise exception 'Verified Trail author profile not found' using errcode = '42501';
    end if;
    if ((select count(*) from public.trail_media m where m.trail_id = new.trail_id)
      + (case when nullif(btrim(coalesce(v_legacy_cover, '')), '') is null then 0 else 1 end))
      >= v_limit then
      raise exception 'Trail photo limit reached' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vq_trail_media_guard_trigger on public.trail_media;
create trigger vq_trail_media_guard_trigger
before insert or update on public.trail_media
for each row execute function public.vq_trail_media_guard();

-- A legacy cover can be changed separately through the existing Trail UPDATE
-- API; enforce the same 3/6 total quota when that changes.
create or replace function public.vq_trail_media_legacy_cover_guard()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_limit integer;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select exists(
    select 1 from public.vq_admin_assignments a
    where a.auth_user_id = v_uid and a.active and a.role = 'platform_admin'
  ) into v_is_admin;
  select case
    when v_is_admin or coalesce(p.account_type, 'vibe') in ('pro', 'business') then 6
    else 3 end into v_limit
  from public.profiles p where p.id = new.author_id;
  if v_limit is null then
    raise exception 'Verified Trail author profile not found' using errcode = '42501';
  end if;
  select count(*) into v_count from public.trail_media m where m.trail_id = new.id;
  if v_count + (case when nullif(btrim(coalesce(new.image_url, '')), '') is null
    then 0 else 1 end) > v_limit then
    raise exception 'Trail photo limit reached' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists vq_trail_media_legacy_cover_guard_trigger on public.vibe_trails;
create trigger vq_trail_media_legacy_cover_guard_trigger
before update of image_url on public.vibe_trails
for each row when (new.image_url is distinct from old.image_url)
execute function public.vq_trail_media_legacy_cover_guard();

-- A private Storage bucket stays private. Only objects explicitly attached
-- to public Trails can be read by visitors using signed URLs.
drop policy if exists vq_trail_attached_media_read on storage.objects;
create policy vq_trail_attached_media_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.trail_media tm where tm.object_path = name
    )
  );
-- Remove an abandoned or intentionally detached object only from its owner
-- and only after its Trail association has been removed.
drop policy if exists vq_trail_unattached_media_owner_delete on storage.objects;
create policy vq_trail_unattached_media_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'trails'
    and not exists (
      select 1 from public.trail_media tm where tm.object_path = name
    )
  );
