# VQULTIMATE — Progress and evidence register

**Document status:** AUDITED SOURCE/REMOTE SNAPSHOT — 2026-11-13. This is an execution tracker, not a declaration that the complete app is accepted or production ready.

**Repository:** funmarket/VQULTIMATE, branch main. **Inspected baseline:** ced6dedbe09cc260c3e99032df00073650e9764f (2026-11-13 audit). A new agent MUST re-read branch HEAD, documents and source at the start of work; this hash is a historical checkpoint, not a pinned execution target.

**Connected backend inspected read-only:** Supabase project avdfessrhbsqwlfmbdau (VQuestGemini). Listing showed 59 public tables, 15 Supabase migration-history records, PostGIS 3.3.7 installed, and two ACTIVE Edge Functions: sign-in-by-username v2 and nearby-places v8. These observations do not establish end-to-end product, RLS, UI or deployment acceptance.

## Evidence terminology (mandatory)

- **SOURCE OBSERVED:** named source code or UI exists at the inspected revision; not proof of working end-to-end behavior.
- **DEPLOYED SOURCE OBSERVED:** backend deployment source or version was read directly; not proof of request-level success.
- **NOT VERIFIED:** behavior/acceptance lacks current test, authenticated-user, browser or runtime evidence.
- **BLOCKED:** a directly inspected implementation currently cannot provide its advertised operation.
- **PROTOTYPE ONLY:** a separate ZIP or local demo; not integrated into this GitHub repository.
- **COMPLETE — VERIFIED:** reserved for an explicit acceptance contract with recorded, fresh, matching evidence; do not infer from green builds, file existence or UI cards.

The former register's blanket COMPLETED rows are reclassified below; a historical completion claim is not current acceptance evidence.

## Evidence-grounded feature inventory

| Feature / source boundary | Verified current fact | Acceptance status |
| --- | --- | --- |
| D01 auth / src/domains/d01_auth | Auth module and Supabase client wiring are present. No current signed-in/denied-session acceptance run was executed during this documentation audit. | SOURCE OBSERVED — NOT VERIFIED |
| D02 users / src/domains/d02_users | Profile/user module is present; data correctness, ownership and account-category acceptance were not tested. | SOURCE OBSERVED — NOT VERIFIED |
| Explore / src/components/ExploreTab.tsx | Existing MapLibre map, marker rendering, category UI, place cards and 23 km discovery scope are in source. | SOURCE OBSERVED — browser behavior NOT VERIFIED |
| D03 Orbit / src/domains/d03_vibe_orbit/api.ts | fetchNearbyPlaces invokes Supabase near-by discovery and enriches returned place IDs. | SOURCE OBSERVED — provider BLOCKED |
| Supabase nearby-places Edge Function | GitHub source returns 503 VENUE_DISCOVERY_UNAVAILABLE for POST; connected deployed v8 source also returns 503. The retired GET photo-proxy route returns 410. This is an explicit unavailable response, not a successful empty result. | BLOCKED — DEPLOYED SOURCE OBSERVED |
| D05 Vibe / src/domains/d05_vibe | Existing social/vibe module is not proof of the conceptual canonical D05 Places owner or D12 full social-content acceptance. | SOURCE OBSERVED — NOT VERIFIED |
| D06 purse / src/domains/d06_purse | A purse module exists; balances, transactions, idempotent ledger rights and real VQ award acceptance were not verified. | SOURCE OBSERVED — NOT VERIFIED |
| D07 Trails / Guardians; D08 Tours / Notifications | Legacy modules and UI exist. Distinct canonical Trails, Guardians, Tours and Notifications contracts still require owner/API/runtime reconciliation. | SOURCE OBSERVED — NOT VERIFIED |
| D10 activities / D11 events | Source directories exist. D11 createFlashEvent and submitVibeSuggestion currently return explicit unavailable errors, and list functions return empty results. | D11 BLOCKED; other paths NOT VERIFIED |
| Share / camera / social | ShareTab and legacy d04_share source exist. Neither file existence nor an in-app toast proves canonical D12 publication, D13 durable media or private access. | SOURCE OBSERVED — NOT VERIFIED |
| D13 media (conceptual) | No dedicated src/domains/d13_media module is present. src/domains/d13_vibe_flash has a different responsibility. Do not equate them. | OWNER IMPLEMENTATION NOT VERIFIED |
| D15 Drift / D17 matching / D19 reviews / D22 Handshake | Related source modules exist. Real bilateral permissions, messages, reviews, Handshakes and acceptance are outside this documentation-only audit. | SOURCE OBSERVED — NOT VERIFIED |
| User-added place from shared URL, OSM matching, Commons/Wikidata photo suggestion and uploads | Demonstrated in separate local VibeQuest test ZIP iterations in this conversation. Not committed or verified in VQULTIMATE source. Earlier link/photo regressions remain a reason for direct acceptance testing. | PROTOTYPE ONLY — GitHub integration NOT STARTED |

## Important source/database discrepancy

The repository contains **five migration SQL files** under supabase/migrations, while the connected backend lists **15 migration-history entries** and **59 public tables**. These inventories are not equivalent; no inference of migration parity or schema completeness is authorized. The connected backend contains a public.places table, and a read-only schema query found **no public.vibe_places table**, despite earlier Progress.md text claiming direct vibe_places queries.

The current root Requirements.md, structure.md and Database.md were short inherited VQgemini summaries and were not comprehensive governing specifications. See the reconciled identity/status notices in those files and the pinned historical approved reference texts. Preserve the approved 28-domain conceptual target without claiming the current directory names already satisfy it.

## Latest directed work awaiting integration

**MapLibre / OpenStreetMap place contributions:** User pastes a place-sharing link; resolver identifies possible place and preserves working Google-link recovery; real OSM/geocoding matches are selectable and ambiguities are flagged (e.g., Café vs Restaurant); user taps/edits a coordinate pin; available real metadata and reusable attributed imagery (including Commons/Wikidata) or user-uploaded photo form the editable draft; authorized persistent publication follows real backing-store, access and moderation contracts. Photo unavailability must not block place identification or be represented by a fabricated photo.

This is an **approved desired experience**, not a claim that a server-side resolver, place submission API, photo-rights pipeline or public rollout currently exists in VQULTIMATE. The local ZIP must not be mistaken for the canonical application.

## For the next working agent (mandatory freshness gates)

1. Start from the latest Product Owner instruction, then re-read Master Plan.md, Requirements.md, structure.md, Database.md and this Progress.md.
2. Inspect exact fresh GitHub branch/HEAD, relevant components/domain public APIs, migration files and connected backend before changing any statement or source. Check other agents' concurrent commits.
3. Resolve conceptual D01–D28 owners against current legacy folders; do not assume matching prefix numbers imply matching business domains.
4. Keep approved existing UI and working link-resolution behavior; no arbitrary substitutions, mock successful persistence, unlicensed photo copying, or replacement of current domain authorship.
5. Require a focused RED reproduction, minimal authorized change, GREEN tests, actual browser/provider check where applicable and exact-scope diff before reporting a fix.
6. Record **UNKNOWN** or **NOT VERIFIED** when proof is missing. No migration, push, merge, new dependency, or deployment is authorized by this tracker.

## Documentation audit boundaries

**Inspection methods:** GitHub repository connector (five Markdown documents, tree, source and history) and connected Supabase read-only project/table/migration/function listings and deployed nearby-places source. **No runtime browser journey, application test suite, migration application, source commit, user-data query or deployment was executed to obtain this snapshot.**

**Historical UI claims to preserve for later verification, not assert as completed:** no horizontal overflow, mobile-first shell, hidden scrollbars, auto-hiding bottom navigation, Vibe six subtabs, proper camera preview, EN/FR/AR/RTL and accurate accessible loading/error states.

**Do not turn a documentation refresh into an implementation command.**
