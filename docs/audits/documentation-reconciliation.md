# VQULTIMATE documentation source reconciliation — 2026-11-23

**Scope:** Documentation-only restoration candidate for review, based on current `main` at `84d4e57d07efef48df3254ff91050bcd367ac3a0` and the full November 5 import assets. No application, SQL, Supabase or deployment modifications.

## Provenance

| Governing file | Full source preserved in Git history | Policy |
|---|---|---|
| `Master Plan.md` | `public/assets/aistudio/Paste_November_05__2026_-_2_00PM_1f2cfcca` | Full imported baseline, with VQULTIMATE identity notice |
| `Requirements.md` | `public/assets/aistudio/Paste_November_05__2026_-_2_00PM_b3bff665` | Full imported baseline, with VQULTIMATE identity notice |
| `Database.md` | `public/assets/aistudio/Paste_November_05__2026_-_2_01PM_39fa6f88` | Full imported baseline, with VQULTIMATE identity notice |
| `structure.md` | `public/assets/aistudio/Paste_November_05__2026_-_2_01PM_6ffd0ac1` | Full imported baseline, with VQULTIMATE identity notice |

The 2026-11-06 Share/social correction from the current root `Master Plan.md` was integrated into the full Master Plan and retained as an explicitly dated amendment. The short root Requirements, Structure, and Database summaries did not replace their full original governing baselines; the full content is restored here.

## Current-state guardrails

- **Current app is VQULTIMATE**, not the historical VQgemini reference repository. Legacy descriptions inside restored source sections are provenance, not evidence of current runtime implementation.
- **Current source has multiple legacy and conceptual domain names** (including `d03_social_graph` alongside `d03_vibe_orbit`, and `d04_geo_presence` alongside `d04_share`). A numbered directory is not proof that the approved 28-domain ownership contract has been implemented.
- **Progress.md remains the separately audited evidence register**, dated 2026-11-13; its statuses must be reverified before any new completion claim.
- The original full files include historical DELTA sections, cross-cutting policies and older repository references. These are retained rather than silently removed. This recovery does not automatically resolve every historical contradiction, migrate database schema, or certify runtime acceptance.
- The original paste assets remain unchanged to provide forensic source comparison.

## Review checkpoints before merging

1. Compare restored documents to the four original source blobs and to current root files, including every decision delta.
2. Confirm that the November 6 Share/social recovery amendment and 10-second Vibe Snap scope are retained.
3. Reconcile any conflicting duration, ownership or deployment wording with explicit Product Owner authority; do not invent precedence.
4. Audit conceptual D01-D28 ownership against actual modules, imports and canonical table writers before marking implementation complete.
5. Require a fresh repository head, exact changed-file diff, and explicit approval before the candidate is merged to `main`.
