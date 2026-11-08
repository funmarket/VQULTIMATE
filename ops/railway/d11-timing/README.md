# D11 Railway timing worker — read-only preparation

**Status: source-only; NOT deployed or provisioned.** The VQULTIMATE Railway staging environment currently has Postgres and `migration-audit-runner` but no D11 worker or Redis. Do not change the audit runner into the event worker or reuse the old VibeQuest environment.

## Responsibilities

- Classify D11 `flash_events` using authoritative `starts_at` and `ends_at` timestamps (upcoming within 60 minutes, live, expired).
- Read a bounded window from the **same canonical Supabase project**. No independent Railway event database; no writes, reward grants, RSVP, notifications, TTL triggers, or assertions that background actions ran.
- Log aggregate counts without user identifiers or secrets. The worker is intentionally diagnostic and **does not activate, close or publish events**.

## Future staging service (separately approve before creating/deploying)

1. Confirm the D11 migrations and event table exist in the target Supabase staging environment; verify permissions, event visibility and expiry with role-based tests. The D11 source migration now specifies visibility from 60 minutes before the start through the actual end time, but the migration is still unapplied and requires isolated authorization and timing tests before public release.
2. Create a dedicated service inside the **existing** VQULTIMATE Railway project and staging environment. No new PostgreSQL/Redis required to run this probe.
3. Provide server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `D11_WORKER_ENABLED=true`. Never name secrets with `VITE_` and never copy service credentials into frontend source or logs.
4. Configure `node worker.mjs` as start command with a working directory of `ops/railway/d11-timing`. Health, monitoring, cost and restart settings need an explicit release review. Run `npm test` first.
5. Disable with `D11_WORKER_ENABLED=false`. Never interpret worker output as proof of actual push alerts, Redis presence, or automatic event mutation.

## Verification

`node --test timing.test.mjs`

This tests pure schedule boundaries and read-only request behavior using a synthetic fetch function; it does not query the live database. Test active, upcoming, expired, error and cancelled data against installed Supabase schema before any deployment.
