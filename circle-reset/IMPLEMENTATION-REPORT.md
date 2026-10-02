# Circle-Only Product Reset: Implementation Report

Date: 2026-09-22 (updated per Nolan's radical-simplification redirect, ~12:00 MDT). Branch: `fyd/builder-composition` (uncommitted). Repo: `/home/nolan/projects/ping`.

## Directive applied

Happy Place ONLY. No Coppersmith until Nolan approves. No orbit system, no spatial nav, no service objects, no website builder, no new authority/database/protocol. One Circle, one expansion, one shared assistant. Report in Nolan's template (see parent report).

## Source changes (11 files, no commits)

Prior 9 files plus:

10. `src/fyd/preview/pipeline.ts` (modified)
    - Added `HOMEPAGE_CIRCLE_SITE_IDS = ["happy-place"]`: the staged rollout
      gate. Product configuration, not customer branching; every listed id
      flows through the identical projection/component path. Approving
      Circle #2 is a one-line change.

11. `src/app/page.tsx` (modified)
    - Builds circles from `HOMEPAGE_CIRCLE_SITE_IDS` instead of enumerating
      all object ids. Verified: exactly one projection resolves (happy-place).

12. `src/fyd/ui/portal-circle.tsx` (modified, second change)
    - Mobile engaged treatment: below 640px viewport width, tap opens a
      `CompactSheet` bottom sheet instead of the circle+orbit spatial
      expansion (320px cannot honestly hold the orbit footprint; the old
      code returned null and the tap did nothing).
    - Sheet: image, name, category/location, tagline, top service facts,
      Ask FYD / Follow / Like / Website actions, evidence provenance,
      close control. Escape, outside-tap, and close button collapse it.
      Reduced motion honored. 44px targets. Same identity data, no orbit.

## Component seam (directive mapping, no refactor needed)

- identity -> `portal: PortalProjection`
- position/anchor -> `slot: PeripheralSlot | null`
- priority -> degenerate with one Circle; PortalHost owns ordering (stacking not blocked)
- selected -> `engaged: boolean` (host enforces one active at a time)
- onSelect -> `onEngageRequest` / `onRelease`

## Image provenance (no hotlinking)

Happy Place's resting/expanded image is the locally-served website-snapshot
derivative `/fyd-media/<digest>/...webp` with provenance (capture method,
timestamp, digest, source URL). Caveat: no rights-cleared logo exists in the
media manifest; the Circle shows the snapshot, labeled as website preview.
No ownership inferred.

## What was built

One homepage, one literal Circle component, one global Ask FYD assistant, two identities through the same evidence-backed path.

### Source changes (9 files, no commits)

1. `src/fyd/ui/portal-circle.tsx` (modified)
   - Removed the embedded per-Circle Ask FYD state and conversational UI.
   - Added `onAskRequest(id)`; the Ask FYD perimeter control hands context to the global assistant.
   - Follow/like still call local `/api/fyd/follow` and `/api/fyd/like` (BLOCKER, see below).

2. `src/fyd/ui/portal-host.tsx` (modified)
   - Reports `engagedId ?? awareId ?? null` up via `onContextChange`.
   - Mobile placement solved: when geometry reports zero usable margin slots anywhere, the circles render as an inline strip in the document flow (`data-ping-inline-strip`), same Circle component, tap to engage, outside-tap/Escape collapses. No bottom portal. The fixed dock branch stays null.

3. `src/fyd/ui/global-ask-dock.tsx` (new)
   - One small global assistant. Floating trigger + compact panel. Resets answers on tenant/object context change.
   - Uses trusted route `POST /api/fyd/ask/[siteId]` with `{question, objectId, mode: "visitor"}`.

4. `src/fyd/ui/home-circles.tsx` (new)
   - Client composition boundary: `PortalHost` -> `GlobalAskDock`. One selected context `{siteId, objectId, displayName}`. No customer-specific branches.

5. `src/app/page.tsx` (modified)
   - Renders `HomeCircles` instead of `PortalHost`. Portal construction preserves tenant + object identity.

6. `src/app/portal-rail/rail-client.tsx` (modified)
   - Temporary no-op `onAskRequest` to satisfy the updated Circle API. Route now 404s (see below).

7. `src/middleware.ts` (modified)
   - Experimental page routes return 404: `/objects`, `/objects/spatial`, `/sites/*`, `/o`, `/o/*`, `/build/*`, `/portal-rail`.
   - Kept live: `/node/*` (practice surface), `/embed/*`, `/dev/*`, `/fyd` (onboarding), all `/api/*`.

8. `scripts/test-circle-reset.ts` (new) + `package.json` (modified)
   - `npm run test:circle-reset`: 48 invariants, all passing.

### Verification (all observed, not claimed)

- `npx tsc --noEmit`: clean.
- `npm run test:circle-reset`: 48/48 PASS (same-path projections, evidence fields, capabilities, no customer literals, no per-circle Ask, one global dock, mobile strip, route disabling, URL safety, live HTTP spot checks).
- `POST /api/fyd/ask/happy-place` with the dock's exact payload: returns evidence-bounded answer with citations.
- Refusal case returns honest "I do not have evidence" (no guessing).
- Live routes: `/` 200, `/objects` `/objects/spatial` `/sites/happy-place` `/o` `/portal-rail` `/build/x` 404, `/fyd` 200, `/api/*` untouched.

## BLOCKER: follow/like cannot emit backend events

- `/api/fyd/follow` and `/api/fyd/like` (what PortalCircle calls): anonymous demo-local JSON persistence, no canonical events.
- `/api/practice/follow` and `/api/practice/like`: emit signed `RELATIONSHIP_CREATED` events but require a `ping_practice_identity` session; anonymous visitors get 400.
- `/api/fyd/social/follow`: emits signed canonical follow events but requires an explicit actor with canonical `identity_<16hex>` ID and escrowed FYD dev key; business object IDs are not valid actors. No `/api/fyd/social/like` exists.
- No authorized anonymous event-emission path exists. Did not invent identity. This is the first broken requirement; needs Nolan's call on whether anonymous visitors get provisioned actors or the controls stay demo-local.

## Not yet done (needs browser lane + decisions)

- Browser acceptance: desktop, 390x844, 320px, hover/focus, keyboard/Escape, outside click, mobile tap, context switching, follow/like behavior, reduced motion, accessibility. Not claimable without a browser.
- Homepage currently builds 3 projections (includes `ping-fyd`); a generic eligibility rule is needed to select exactly Happy Place + Coppersmith without customer-name branching.
- Reversibility: full diff at `~/workspace/circle-reset/reset-diff.patch`; originals of portal-circle, portal-host, middleware in `/tmp/circle-staging/backup/`.
