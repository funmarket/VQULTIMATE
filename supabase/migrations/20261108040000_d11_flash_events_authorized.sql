-- D11 Flash Events are NOT D18's 60-second vibe_flash_windows.
-- REVIEW-ONLY migration. Apply only after a real staging test and explicit Product Owner approval.
-- Do not create, replace, delete or alter any existing Vibe Flash tables.
create table if not exists public.flash_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 3000),
  place_id text,
  secret_id text,
  kind text not null default 'secret_party'
    check (kind in ('secret_party','after_hours','private_game','happy_hour','limited_promo','other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active','closed','cancelled')),
  created_by_auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint d11_flash_valid_window check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours')
);
-- Detect incompatible independently-created tables instead of treating IF NOT EXISTS as schema validation.
do $d11_preflight$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='flash_events'
      and column_name='created_by_auth_user_id' and udt_name='uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='flash_events'
      and column_name='ends_at' and data_type='timestamp with time zone'
  ) then
    raise exception 'Existing flash_events schema is incompatible; manual reconciliation is required';
  end if;
end;
$d11_preflight$;
create index if not exists d11_flash_events_active_end_idx
  on public.flash_events (ends_at, starts_at) where status = 'active';
alter table public.flash_events enable row level security;
revoke all on public.flash_events from PUBLIC, anon, authenticated;
grant select (id,title,description,place_id,secret_id,kind,starts_at,ends_at,status,created_at)
  on public.flash_events to anon,authenticated;
grant insert (title,description,place_id,starts_at,ends_at,kind)
  on public.flash_events to authenticated;
drop policy if exists d11_public_active_events_read on public.flash_events;
create policy d11_public_active_events_read on public.flash_events
  for select to anon,authenticated
  using (status='active' and starts_at <= now() + interval '60 minutes' and ends_at > now());
drop policy if exists d11_admin_only_event_create on public.flash_events;
create policy d11_admin_only_event_create on public.flash_events
  for insert to authenticated
  with check (
    created_by_auth_user_id = (select auth.uid())
    and status = 'active'
    and starts_at >= now() - interval '2 minutes'
    and exists (
      select 1 from public.vq_admin_assignments a
      where a.auth_user_id = (select auth.uid())
        and a.active = true and a.role = 'platform_admin'
    )
  );
-- Scheduled events remain visible only within 60 minutes of start; event expiry is based on ends_at.
-- No update/delete grants; no forged event state changes from clients.
-- Business operator authorizations require a separate verified D11 entitlement contract.
