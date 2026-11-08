-- REVIEW ONLY: D11 RSVP and moderated Vibe Suggestions. Do not apply without
-- Product Owner authorization, schema compatibility review and isolated role tests.
-- Requires PR #22's D11 flash_events prerequisite; no changes to D18 vibe flash.
do $d11_participation_preflight$
begin
  if to_regclass('public.flash_events') is null then
    raise exception 'D11 flash_events is missing; install the approved D11 migration first';
  end if;
end;
$d11_participation_preflight$;

create table if not exists public.flash_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flash_events(id) on delete cascade,
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, auth_user_id)
);
create index if not exists d11_flash_rsvp_user_idx
  on public.flash_event_rsvps (auth_user_id, created_at desc);
alter table public.flash_event_rsvps enable row level security;
revoke all on public.flash_event_rsvps from PUBLIC, anon, authenticated;
grant select (id, event_id, auth_user_id, created_at) on public.flash_event_rsvps to authenticated;
grant insert (event_id) on public.flash_event_rsvps to authenticated;
grant delete on public.flash_event_rsvps to authenticated;
drop policy if exists d11_rsvp_self_read on public.flash_event_rsvps;
create policy d11_rsvp_self_read on public.flash_event_rsvps
  for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists d11_rsvp_live_event_self_insert on public.flash_event_rsvps;
create policy d11_rsvp_live_event_self_insert on public.flash_event_rsvps
  for insert to authenticated with check (
    auth_user_id = (select auth.uid())
    and exists (
      select 1 from public.flash_events e
      where e.id = event_id
        and e.status = 'active'
        and e.starts_at <= now() + interval '60 minutes'
        and e.ends_at > now()
    )
  );
drop policy if exists d11_rsvp_self_cancel on public.flash_event_rsvps;
create policy d11_rsvp_self_cancel on public.flash_event_rsvps
  for delete to authenticated using (auth_user_id = (select auth.uid()));
-- No client RSVP UPDATE grant. Duplicate RSVP is rejected by UNIQUE.
-- Event capacity, public attendance counts and waitlist are NOT supported.

create table if not exists public.vibe_suggestion_submissions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  category text not null check (category in ('place','event','vibe')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists d11_vibe_suggestions_user_idx
  on public.vibe_suggestion_submissions (auth_user_id, created_at desc);
create index if not exists d11_vibe_suggestions_review_idx
  on public.vibe_suggestion_submissions (status, created_at);
alter table public.vibe_suggestion_submissions enable row level security;
revoke all on public.vibe_suggestion_submissions from PUBLIC, anon, authenticated;
grant select (id,auth_user_id,title,description,category,status,created_at)
  on public.vibe_suggestion_submissions to authenticated;
grant insert (title,description,category) on public.vibe_suggestion_submissions to authenticated;
drop policy if exists d11_suggestion_self_read on public.vibe_suggestion_submissions;
create policy d11_suggestion_self_read on public.vibe_suggestion_submissions
  for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists d11_suggestion_self_submit on public.vibe_suggestion_submissions;
create policy d11_suggestion_self_submit on public.vibe_suggestion_submissions
  for insert to authenticated with check (
    auth_user_id = (select auth.uid()) and status = 'pending' and reviewed_at is null
  );
drop policy if exists d11_suggestion_admin_read on public.vibe_suggestion_submissions;
create policy d11_suggestion_admin_read on public.vibe_suggestion_submissions
  for select to authenticated using (
    exists (
      select 1 from public.vq_admin_assignments a
      where a.auth_user_id = (select auth.uid())
        and a.active = true and a.role = 'platform_admin'
    )
  );
-- Client account cannot approve, change status, or delete other users' submissions.
-- Admin moderation writes require a later separately authorized backend contract.
