# VQgemni — Requirements.md

**ID:** VQ-REQ-001  
**Date:** 2026-10-30  
**Product:** VQgemni  
**Repository:** `funmarket/VQgemini`, default branch `main`  
**Status:** **PRODUCT OWNER APPROVED GOVERNING PRODUCT REQUIREMENTS.**  
This document is the approved product-behavior baseline. Implementation remains subject to the approved Master Plan, current source verification, task authorization and acceptance gates.  

## Modular Monolith Rules (additive)
The existing `funmarket/VQgemini` React/Vite application remains one frontend, one Supabase project (PostgreSQL/PostGIS, Auth, Storage and Edge Functions as needed), and one deployment. The 28 numbered domains under `src/domains/dXX_*` are internal modules, not separate services; each is the sole authorized writer of its canonical tables. Domain public commands and queries are exported through `index.ts` only.
