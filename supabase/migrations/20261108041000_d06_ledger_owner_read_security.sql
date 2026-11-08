-- D06 VQ ledger read security: preserve existing balances and legacy rows.
-- REVIEW ONLY: do not apply until staging and explicit production SQL authorization.
-- Legacy user_id is text and is NOT trustworthy proof of auth.uid ownership.
alter table public.vq_ledger add column if not exists owner_auth_user_id uuid;
do $d06_preflight$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='vq_ledger'
      and column_name='owner_auth_user_id' and udt_name='uuid') then
    raise exception 'vq_ledger owner_auth_user_id is not UUID; reconcile manually';
  end if;
end;
$d06_preflight$;

alter table public.vq_ledger enable row level security;
-- Remove the observed catch-all policy allowing public SELECT/INSERT/UPDATE/DELETE.
drop policy if exists "Public access policy for vq_ledger" on public.vq_ledger;
-- No browser client may insert, modify, or delete the financial ledger.
revoke all on table public.vq_ledger from PUBLIC, anon, authenticated;
grant select (id, direction, amount, reason_code, notes, created_at)
  on public.vq_ledger to authenticated;

drop policy if exists d06_ledger_owner_read on public.vq_ledger;
create policy d06_ledger_owner_read on public.vq_ledger
  for select to authenticated using (
    owner_auth_user_id is not null and owner_auth_user_id = (select auth.uid())
  );
-- Existing rows intentionally retain NULL owner until verified identity reconciliation.
-- Privileged ledger posting procedures must validate provenance and set owner_auth_user_id.
-- Do NOT convert user_id to uuid, assign guessed ownership, or fabricate balances.
