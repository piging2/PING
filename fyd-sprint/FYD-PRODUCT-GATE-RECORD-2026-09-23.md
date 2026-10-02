# FYD Product Gate Record — 2026-09-23 (Wave 1 settlement lane)

Lane: FYD REPO LANE (Wave 1 settlement, 13-item product gate, clean commit, clean-SHA proof, production build).
Branch: `fyd/builder-composition`. No new architecture. No pushes.

## Candidate SHA

`e48ef710cb889bf4d59b833ef9766067a9e2bbf0` ("FYD Wave 1 fixup: current product UI implementation + ask test alignment")
Branch `fyd/builder-composition` on the Pig at `/home/nolan/projects/ping`.

## min-w-0 verification (8a99742)

- Commit `8a997421ef5f121f114d948c693391f1a9c7c66e` "fyd(mobile): prevent 320px overflow in Ask FYD design-token row" (2026-09-21).
- Verified committed AND an ancestor of e48ef710 (`git merge-base --is-ancestor 8a99742 e48ef710` = true).
- One-line change in `src/app/sites/happy-place/site-client.tsx`. Recorded, NOT re-committed.

## Toolchain (Pig)

- Node `v22.23.2`, npm `10.9.8` (package.json `packageManager` field says `npm@10.9.2`; actual Pig npm is newer patch, install works).
- Install command: `npm ci --no-audit --no-fund` → 746 packages, exit 0.
- Test command (canonical gate): `npx jest --config <lane-config> --ci --silent` × 21 configs + `npx tsc --noEmit`.
- `src/fyd/jest.config.cjs` exclusion re-verified: absent from the committed tree at e48ef710 (it exists on disk only as an untracked file); gate unchanged, exclusion still correct.

## STEP 1 — Wave 1 settlement (clean worktree at e48ef710)

Worktree: `/home/nolan/projects/ping-wave1-check` (detached HEAD e48ef710, created via `git worktree add`, 0 reliance on any other lane's node_modules).
Result: **VERIFIED**. All 21 jest configs exit 0; `tsc --noEmit` exit 0.

| Config | Suites | Tests | Exit |
|---|---|---|---|
| src/app/api/fyd/ask | 4 | 73 | 0 |
| src/app/api/fyd/objects/[objectId]/overrides | 2 | 24 | 0 |
| src/fyd/adapters/activitypub | 1 | 9 | 0 |
| src/fyd/archetypes | 1 | 11 | 0 |
| src/fyd/ask | 8 | 124 | 0 |
| src/fyd/boundary | 1 | 6 | 0 |
| src/fyd/builder | 9 | 71 | 0 |
| src/fyd/components | 7 | 82 | 0 |
| src/fyd/customize | 2 | 20 | 0 |
| src/fyd/identity | 8 | 75 | 0 |
| src/fyd/media | 7 | 75 | 0 |
| src/fyd/net | 8 | 71 | 0 |
| src/fyd/object | 15 | 178 | 0 |
| src/fyd/placement | 2 | 16 | 0 |
| src/fyd/proceduralize | 9 | 82 | 0 |
| src/fyd/sitespec | 10 | 91 | 0 |
| src/fyd/spatial | 5 | 30 | 0 |
| src/fyd/tenant | 5 | 28 | 0 |
| src/fyd/ui | 5 | 138 | 0 |
| src/fyd/wiring | 1 | 8 | 0 |
| src/motion | 1 | 7 | 0 |
| **Total** | **111** | **1219** | all 0 |

Note: this clean-checkout count (111 suites / 1219 tests) differs from the SPRINT-LOG claim at 490f5f7c (121 suites / 1358 tests; ui claimed 10/229, observed 5/138). The observed numbers above are what the clean worktree at e48ef710 actually produces; they are the verified canonical count.

## STEP 2 — 13-item product gate (evidence from targeted runs in the clean worktree)

| # | Gate item | Verdict | Evidence |
|---|---|---|---|
| 1 | Canonical test (full jest gate) | PASS | 21/21 configs green, 111 suites / 1219 tests, `tsc --noEmit` exit 0 |
| 2 | URL safety (contact-flow / unsafe-URL-scheme) | PASS | `contact-link.test.ts` 14/14 green; asserts `javascript:` (incl. mixed-case `JaVaScRiPt:`), `data:text/html`, `vbscript:` are safety-gated |
| 3 | Hostile content (hostile/spoof tests) | PASS | `projection-boundary.test.ts` 7/7; `safe-link.test.ts` 16/16; `contact-method-projection` + `by-id` + `related` 33/33 |
| 4 | Binding verifier (sitespec lane) | PASS | `binding-verifier` + `verified-render-model` + `render-model` 31/31 |
| 5 | Visibility override (overrides lane) | PASS | overrides config 2 suites / 24 tests green; `field-visibility.test.ts` 10/10 (one earlier EXIT=1 was a CLI regex-quoting artifact on `[objectId]`, not a test failure; re-ran clean) |
| 6 | Semantic determinism (digest regression) | PASS | `structured-determinism.test.ts` 6/6; committed "semantic determinism regression" describe in `verified-render-model.test.ts` (same inputs → identical digest, shuffled insertion order → same digest, no timestamps in digest, changed atom → changed digest) |
| 7 | Desktop viewport | PASS | `compose.test.ts` 30/30 incl. `widthClassFor(1024)=="lg"`, `widthClassFor(1440)=="xl"` |
| 8 | 320 mobile | PASS | `widthClassFor(320)=="xs"` (compose) + `resolvePresenceMode(...,320,...)` rail/drawer cases (object-rail) green |
| 9 | 375 mobile | PASS | `widthClassFor(375)=="xs"` (compose) green |
| 10 | Source → evidence (ingest) | PASS | media `pipeline-invariants` + `provenance` 20/20; boundary `data-boundary` 6/6; net `safe-fetch` 17/17 |
| 11 | Evidence → objects (object lane) | PASS | `view` + `projection-relations` + `services` + `owner-overlay` 38/38 |
| 12 | Objects → SiteSpec (builder/planner lane) | PASS | `planner` + `object-builder` + `eligibility` 37/37 |
| 13 | SiteSpec → render (renderer lane) | PASS | components lane green (7 suites / 82); `render.test.ts` 1/1; `compose.test.ts` 30/30 render-composition cases |

No gate-repair failures existed in the owned slice; nothing was invented, nothing weakened. No gate item lacked tests.

## STEP 3 — clean commit

**Zero commits made.** At HEAD e48ef710 the working tree contains exactly the 37 do-not-touch files and nothing else:
verified via `diff` of sorted `git status --short` paths against the do-not-touch list → exact match (`MATCH37`).
All Wave-1 work (490f5f7c, 696dd13f, e48ef710) is already committed; no owned Wave-1 files were pending. No `git add` of any listed file was performed. No push (Vercel lane owns the remote).

## STEP 4 — proof from a clean SHA (production build)

Fresh worktree: `/home/nolan/projects/ping-wave1-build` (detached HEAD `e48ef710`, `git status` clean, fresh `npm ci`, exit 0, 746 packages).

### Fixture digest revalidation (adjusted acceptance)

The demo pages (`/sites/happy-place`, `/sites/coppersmith-plumbing`) read via `getPingObjectGraph(SITE_ID)` in `src/fyd/data/ping-object-source.ts`, which fails closed (file must exist, `meta.siteId` must match, every object must carry a non-empty `provenance.ref`, `sha256(canonicalize(graph))` must equal `meta.graphDigest`). No fixture fallback exists in the code.

- Ran the exact fail-closed code path (`getPingObjectGraphSync`) against the committed fixtures with `FYD_PROJECTION_DIR` set: **both pass**.
  - `happy-place`: OK, 3 objects, digest `8f4737d8…`
  - `coppersmith-plumbing`: OK, 4 objects, digest `afbc132f…`
- No fixture regeneration was needed; the fail-closed behavior and digest check were NOT weakened.

### Production build

Build command:
`FYD_PROJECTION_DIR=/home/nolan/projects/ping-wave1-build/src/fyd/object/__tests__/fixtures/projections npx next build`
Result: **BUILD_EXIT=0**. Route table contains `ƒ /sites/happy-place` and `ƒ /sites/coppersmith-plumbing`.

### Deploy contract (for the preview lane)

`FYD_PROJECTION_DIR` (preview-scoped env var) must point at a directory containing `<siteId>.json` projection files that pass the fail-closed verification. Proven layout:
`<repo>/src/fyd/object/__tests__/fixtures/projections/` with `happy-place.json` and `coppersmith-plumbing.json`.
Caveats:
- On the Pig, the default `/home/nolan/ping/var/fyd-projections/` also exists (Pig-owned dump output, NOT in the repo); it is absent everywhere else, so the env var is required for any non-Pig build/deploy. Do not rely on the Pig default.
- The committed fixture home is currently a `__tests__/fixtures` directory; that is what was proven. Relocation is the preview lane's call.

## First broken step

None. Nothing is BLOCKED. The zero-env-var acceptance from the original brief was superseded by the Vercel-lane recon finding; the adjusted acceptance (build with `FYD_PROJECTION_DIR` → revalidated fixtures) is fully met.

## Dirty files left untouched (37, exact)

Modified (10): `package.json`, `src/app/build/[siteId]/page.tsx`, `src/app/page.tsx`, `src/app/portal-rail/rail-client.tsx`, `src/fyd/builder/owner-intent.ts`, `src/fyd/builder/site-vectors.ts`, `src/fyd/preview/pipeline.ts`, `src/fyd/ui/portal-circle.tsx`, `src/fyd/ui/portal-host.tsx`, `src/middleware.ts`.
Untracked (27): `.github/`, `geometry-regression.mjs`, `scripts/test-circle-reset.ts`, `src/app/objects/`, `src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts`, `src/fyd/builder/__tests__/ping-fyd-error-gate.test.ts`, `src/fyd/builder/__tests__/strategies.test.ts`, `src/fyd/builder/infer-strategy.ts`, `src/fyd/builder/strategies.ts`, `src/fyd/builder/strategy-for-site.ts`, `src/fyd/components/__tests__/ping-fyd-dogfood.test.ts`, `src/fyd/jest.config.cjs`, `src/fyd/media/manifests/ping-fyd.json`, `src/fyd/spatial/__tests__/object-space.test.ts`, `src/fyd/spatial/object-space.ts`, `src/fyd/ui/__tests__/card-placement.test.tsx`, `src/fyd/ui/__tests__/circle-progressive.test.tsx`, `src/fyd/ui/__tests__/expansion.test.ts`, `src/fyd/ui/__tests__/placement.test.ts`, `src/fyd/ui/__tests__/star-layout.test.ts`, `src/fyd/ui/global-ask-dock.tsx`, `src/fyd/ui/home-circles.tsx`, `src/fyd/ui/identity-object.tsx`, `src/fyd/ui/object-layer/MarginObjectLayer.tsx`, `src/fyd/ui/object-layer/MobileSheet.tsx`, `src/fyd/ui/object-layer/placement.ts`, `src/fyd/ui/spatial/`.
