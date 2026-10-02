# LANE 8 WORK ORDER — Public/debug projection separation (DRAFT, launch after MAP-SURFACE + MAP-PROJECTION report)

## Why first
HARD CONSTRAINT (Nolan): no new features on the public HPP page until the public/debug projection separation is fixed. The page is information-complete; another component makes it worse. Baseline screenshots (evidence/baseline/) prove the wrong projection is visible: "Generated site demo / Procedural clone proof" header, SITE RECORD / WEBSITE STATEMENT pills, repeated Why this?, "Customize this site" engineering console inline, DEMO OWNER MODE capability panel, internal semantics as copy.

## Verbatim removal list (public projection)
Remove from the ordinary public projection: `Generated site demo`, `Procedural clone proof`, `Site record`, raw acceptance sequences, raw object IDs, raw proposal digests, unresolved directive debugging, capability evaluation, seeded/unverified actor internals, repeated observation metadata, numbered empty evidence lists, repeated `Why this?`, duplicate phone representations, object-rail debug UI, raw customization machinery. Preserve all underlying truth. Change the projection, not the evidence.

## What to build
1. A single render-side projection seam, e.g. `projectForViewer(state, viewer)` in a new file under src/fyd/ (NOT in the ask pipeline; FYD-010 owns that). Viewer classes mirror the model side: VISITOR, OWNER (verified only), ENGINEER. The page shells for /, /sites/[slug], /build/[siteId] consume ONLY the projected view. No component imports raw state.
2. VISITOR projection contains: business story, hero, nav, services, projects/photos, trust, service area, contact/estimate CTA, Ask FYD, and a QUIET "Source" affordance per claim (source, observed date, direct/derived status; progressive disclosure, not a pill on every card).
3. OWNER projection = visitor page + ONE affordance: "Customize with FYD". (Lane 9 builds the conversational UX; lane 8 only reserves the seam and the entry point.)
4. ENGINEER projection = everything in Nolan's screenshot: actor, capabilities, digests, events, evidence bindings, attestation, provenance, raw graph, object IDs, replay, transition state. Reachable ONLY through a deliberate Advanced / Trust / Developer surface (URL + explicit toggle, never the default page).
5. Demo owner mode (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1) must NOT leak the engineer projection into the default page. The visitor page under demo mode looks identical to the visitor page under any mode.

## Non-negotiables
- Same state, different projections. No data-model fork, no second owner system, no new authority, no new workflow engine.
- No customer-specific conditionals (`if happy-place` is a firing offense; the falsifier is watching).
- Deterministic: identical graph + intent + renderer version = identical output. Existing tests keep passing.
- Isolated worktree from fyd/sprint-integration-2026-09-24 @ a8ed5103. Narrow diff, tests, commit. No reset --hard, no blind stash.
- ONE-WRITER RULE: this lane owns the page shells and any new projection files. It does NOT touch src/fyd/ask/* (FYD-010 owns), src/fyd/onboarding/* (P-01 owns), or Workstream B's ask-composer/visitor-answer files. If a seam needs to cross into owned files, the coordinator sequences it.
- No em dashes in user-visible copy.

## Proof required
- Visitor screenshots at 320/375/390/768/1280/1440 for HPP and Coppersmith showing ZERO items from the removal list (coordinator runs the screenshot harness; lane asserts and the falsifier replays).
- Tests: projection unit tests (visitor view contains no forbidden concepts even when fed full debug state; engineer view retains everything).
- Clean-checkout replay by the coordinator before PASS.

## Inputs (read first)
- findings/map-surface.md (leak inventory with file:line)
- findings/map-projection.md (recommended render seam)
- evidence/baseline/ (what the wrong projection looks like)
