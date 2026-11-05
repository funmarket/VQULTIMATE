# VQgemni — Database.md

**Status:** **PRODUCT OWNER APPROVED CONCEPTUAL DATABASE / PERSISTENCE BASELINE.** This document defines approved conceptual ownership, persistence relationships and invariants. It is NOT an executable schema, migration, installed database state, or permission to provision/mutate infrastructure.

## Modular Monolith Persistence
One existing Supabase Postgres/PostGIS backend serving the single React/Vite application. All 28 domain modules manage their tables via authorized RLS/backend contracts, exposed exclusively through public `index.ts` APIs.
