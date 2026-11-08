-- REVIEW ONLY. D21 paid-plan entitlements and upgrade requests for D11 Flash Events.
-- DO NOT apply to production before separate approval and live-schema compatibility review.
-- Depends on PR #22 D11 flash_events migration and existing vq_admin_assignments.
-- Provider-verified billing/grant fulfillment is NOT installed. No public writes to entitlements.
create table if not exists public.account_entitlements (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pro','business')),
  status text not null check (status in ('active','suspended','cancelled','expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  verified_source text not null,
  verified_reference text not null,
  created_at timestamptz not null default now(),
  constraint d21_valid_entitlement_window check (expires_at is null or expires_at > starts_at),
  constraint d21_verified_source_present check (char_length(btrim(verified_source)) > 0 and char_length(btrim(verified_reference)) > 0)
);
create index if not exists d21_entitlements_current_user_idx
  on public.account_entitlements(auth_user_id,status,starts_at,expires_at);

create table if not exists public.account_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  requested_plan text not null check (requested_plan in ('pro','business')),
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists d21_one_pending_request_per_user
  on public.account_upgrade_requests(auth_user_id) where status = 'pending';
create index if not exists d21_requests_status_created_idx
  on public.account_upgrade_requests(status,created_at);

-- Entitlement grants can only be written by a separately authenticated, trusted server.
alter table public.account_entitlements enable row level security;
revoke all on public.account_entitlements from PUBLIC, anon, authenticated;
grant select (id,auth_user_id,plan,status,starts_at,expires_at) on public.account_entitlements to authenticated;
drop policy if exists d21_entitlement_owner_read on public.account_entitlements;
create policy d21_entitlement_owner_read on public.account_entitlements
  for select to authenticated using (auth_user_id = (select auth.uid()));

alter table public.account_upgrade_requests enable row level security;
revoke all on public.account_upgrade_requests from PUBLIC, anon, authenticated;
grant select (id,auth_user_id,requested_plan,status,created_at,updated_at) on public.account_upgrade_requests to authenticated;
grant insert (requested_plan) on public.account_upgrade_requests to authenticated;
drop policy if exists d21_upgrade_request_self_read on public.account_upgrade_requests;
create policy d21_upgrade_request_self_read on public.account_upgrade_requests
  for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists d21_upgrade_request_self_insert on public.account_upgrade_requests;
create policy d21_upgrade_request_self_insert on public.account_upgrade_requests
  for insert to authenticated with check (
    auth_user_id = (select auth.uid()) and status = 'pending'
  );
drop policy if exists d21_admin_upgrade_request_read on public.account_upgrade_requests;
create policy d21_admin_upgrade_request_read on public.account_upgrade_requests
  for select to authenticated using (
    exists (
      select 1 from public.vq_admin_assignments a
      where a.auth_user_id = (select auth.uid())
        and a.active = true and a.role = 'platform_admin'
    )
  );

-- Keep the D11 event-writer policy fail-closed for all clients except verified
-- platform admin or an active, non-expired Pro/Business entitlement.
-- Preflight raises rather than silently replacing unrelated tables/policies.
do $d21_d11_preflight$
begin
  if to_regclass('public.flash_events') is null then
    raise exception 'D11 flash_events prerequisite missing; install/review PR #22 D11 schema before D21';
  end if;
end;
$d21_d11_preflight$;
drop policy if exists d11_admin_only_event_create on public.flash_events;
drop policy if exists d11_admin_or_entitled_event_create on public.flash_events;
create policy d11_admin_or_entitled_event_create on public.flash_events
  for insert to authenticated with check (
    created_by_auth_user_id = (select auth.uid())
    and status = 'active'
    and starts_at >= now() - interval '2 minutes'
    and starts_at <= now() + interval '30 days'
    and (
      exists (
        select 1 from public.vq_admin_assignments a
        where a.auth_user_id = (select auth.uid())
          and a.active = true and a.role = 'platform_admin'
      )
      or exists (
        select 1 from public.account_entitlements e
        where e.auth_user_id = (select auth.uid())
          and e.plan in ('pro','business')
          and e.status = 'active'
          and e.starts_at <= now()
          and (e.expires_at is null or e.expires_at > now())
      )
    )
  );
-- No client UPDATE or DELETE of events, request decisions, or entitlement grants.
