# VQgemni — structure.md

**Document ID:** VQ-STRUC-001  
**Status:** **PRODUCT OWNER APPROVED ARCHITECTURE / OWNERSHIP BASELINE.**  
Implementation must follow the approved Master Plan, current repository state, the canonical 28-domain ownership model and applicable execution authorization.  
**Date:** 2026-10-30  

## Modular Monolith Rules
One React/Vite frontend, one Supabase project, one deployment. 28 internal domains under `src/domains/dXX_*` acting as sole writers of their canonical tables, exposing public `index.ts` APIs only.
