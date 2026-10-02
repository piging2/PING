# Phase-0 Verification Report: FYD Builder Sprint (Builder-2)

Date: 2026-09-22 ~02:00-03:00 MDT
Verifier role: Phase-0 verifier. Read-only on the repo except evidence files written here.
Repo: Pig only, `/home/nolan/projects/ping`, via `~/workspace/pig/pigwsl-run.sh` bridge.
All repo commands read-only. No commits, no pushes, no source edits. `src/fyd/jest.config.cjs` left untouched.

## 1. Branch / HEAD / dirty state

- Branch: `fyd/builder-composition`
- HEAD: `1539b28cd4c9cc4e6c9612e2620ffd03d18c7a93` ("fyd: evidence-preserving inverse normalization in the object builder")
- Parent: `25caf3c5` ("fyd: Builder-2 compiler core + tenant-scoped runtime entry points")
- `git status --short --branch`: clean except one untracked file:
  - `?? src/fyd/jest.config.cjs` (the known other-worker file; not touched)
- No modified tracked files. No other untracked files. Verified again AFTER all test runs: still clean.

HEAD matches the claimed `1539b28c` exactly.

## 2. Builder jest suite

Command: `npx jest --config src/fyd/builder/jest.config.cjs --verbose`
Result: **7 suites passed, 53 tests passed, 0 failed.**

Per-file counts:
- `object-builder.test.ts`: 15 passed (incl. "works_for derives an evidence-preserving employs inverse", "an explicit forward edge wins over the derived inverse", "missing tenant context refuses", "cross-tenant projection is refused before any graph byte is trusted")
- `planner.test.ts`: 13 passed (incl. "missing tenant context refuses before any planning")
- `dimensions.test.ts`: 7 passed
- `verifier.test.ts`: 8 passed
- `structural-proof.test.ts`: 1 passed
- `structural-diff.test.ts`: 2 passed
- `eligibility.test.ts`: 7 passed

Raw output: `builder-jest.log` (this dir).

## 3. Tenant jest suite

Command: `npx jest --config src/fyd/tenant/jest.config.cjs --verbose`
Result: **5 suites passed, 28 tests passed, 0 failed.**

Per-file counts:
- `e-scoped-stores.test.ts`: 8 passed (symmetric A<->B: overrides read, overrides patch, projection load, Ask FYD bundle, approval recording incl. "A cannot record an approval for B; the gateway is never reached", same-tenant approval passes gate)
- `a-owner.test.ts`: 5 passed
- `b-projection.test.ts`: 5 passed
- `c-ask.test.ts`: 4 passed
- `d-worker.test.ts`: 6 passed

Raw output: `tenant-jest.log` (this dir).

## 4. Lane T adversarial tests (staged)

Staged location: `~/workspace/fyd-lane/builder/tenant-boundary/tests/`
Contents: `__tests__/{a-owner,b-projection,c-ask,d-worker}.test.ts`, `__tests__/helpers.ts`, `tenant-context.ts`, `jest.config.cjs`.

### 4a. Coverage determination (byte-level diff)

Pulled the repo's landed files via the bridge and diffed locally against the staged files:

- `a-owner.test.ts`: IDENTICAL
- `b-projection.test.ts`: IDENTICAL
- `c-ask.test.ts`: IDENTICAL
- `d-worker.test.ts`: IDENTICAL
- `__tests__/helpers.ts`: IDENTICAL
- `tenant-context.ts` (staged) vs `src/fyd/tenant/tenant-context.ts` (landed): IDENTICAL

**Finding: the staged Lane T tests add ZERO coverage beyond what Builder-2 already landed.** They are the landed tests, verbatim. The only test file in the repo with no staged counterpart is `e-scoped-stores.test.ts` (8 tests, covers the real `scoped-stores.ts` wrappers symmetrically). The staged `jest.config.cjs` is also byte-identical in shape to the landed tenant config (plus the landed config adds the css-stub mapping).

### 4b. Scratch-config run (preferred approach, worked)

Approach: copied the repo's landed test bytes (proven identical to staged bytes) to `/tmp/laneT-staged/` on the Pig with read-only `cp` (sha256 of the copy matched the original: `8a65520f...`), wrote a scratch jest config at `/tmp/laneT-staged/jest.config.cjs` with `rootDir=/home/nolan/projects/ping`, `roots=[/tmp/laneT-staged]`, and the `@/` moduleNameMapper pointed at the repo's `src/`. The repo tree was never written to.

Result: **4 suites passed, 20 tests passed, 0 failed** (a=5, b=5, c=4, d=6). Raw output: `laneT-staged-jest.log` (this dir).

The temp-copy-into-repo fallback was NOT needed. `git status` after the run confirms no residue.

### 4c. Adversarial-bar assessment (honest gaps)

The contract module itself is sound: `requireTenantContext` / `assertTenantKey` / `withTenantContext` / `tenantScopedDir` fail closed with typed `TenantContextError`, never empty results. But read-only inspection of the live wiring shows the boundary is only partially realized at runtime:

1. **`scoped-stores.ts` has ZERO production consumers.** Grep over `src/` (excluding `__tests__`) finds no non-test import of the scoped wrappers. The `e-scoped-stores` tests prove the wrappers refuse correctly, but nothing in the running system calls them. The "only sanctioned consumption path" claim in the module docstring is aspirational, not enforced.
2. **Tenant context IS enforced in the builder core, and the live `/build/[siteId]` route uses it.** `src/app/build/[siteId]/page.tsx` builds `{ tenantId: siteId }` from the URL and threads it into `verifyObjectGraph` and `planSite` (both `requireTenantContext`; cross-tenant graphs refused). This is the one live path where the tenant contract is actually wired.
3. **`/api/fyd/ask` takes `siteId` from the request body and calls raw `answerAskFyd` with no tenant context.** No request-body tenant-override adversarial test exists. Mitigating facts: the pipeline answers over PUBLIC objects only (visitor-answer filters `visibility === "public"`; private objects never enter context), and `mode: "owner"` is documented as treated visitor-safe until the authenticated lane exists. Still, a body-supplied siteId can pull any site's public bundle with no tenant gate.
4. **`/api/fyd/objects/[objectId]/overrides` uses raw `applyOwnerCommand`, gated only by the demo chain.** The route header explicitly labels it DEMO/DEV ONLY with no production authentication; `resolveOwnerCorrectionChain` is the gate, not tenant context. The BASELINE GAP test documents the raw owner store serves any caller, and this route confirms the gap is live at the HTTP layer (demo-gated, not tenant-gated).
5. **Visitor-vs-owner scope** is covered by the ask-fyd-visitor lane's own tests (`src/app/api/fyd/ask/__tests__/route.test.ts`: private objects never reach visitors; visitor site-change requests refused), NOT by the Lane T staged tests. No test asserts that `mode: "owner"` grants nothing extra (it is documented behavior, not a tested assertion).
6. No test proves that all request/worker paths route through the scoped wrappers (no negative test that raw stores are unreachable from routes).

## 5. Liveness (dev server, WSL localhost:3100)

- `http://localhost:3100/build/happy-place` -> **200**
- `http://localhost:3100/build/coppersmith-plumbing` -> **200**

## Verdict: PARTIAL (with named gaps)

Builder-2's **test-run claims are VERIFIED**: both jest suites are green with exact counts (builder 53/53 across 7 files; tenant 28/28 across 5 files), the staged Lane T bytes run green against the real repo modules from a /tmp scratch config (20/20), HEAD/branch match, repo left clean, both demo routes return 200.

The **tenant-boundary enforcement claim is PARTIAL**, with these named gaps:
- (G1) Staged Lane T tests contribute no new coverage; they are byte-identical to landed tests.
- (G2) `scoped-stores.ts` wrappers are tested but have zero production consumers; the live ask and overrides routes call the raw stores with no tenant-context gate.
- (G3) No adversarial test for request-body/URL tenant-override at the HTTP layer (`/api/fyd/ask` takes siteId from the body, unbound to any acting tenant).
- (G4) Owner-override mutations at the HTTP layer are demo-chain-gated, not tenant-gated (labeled DEMO/DEV ONLY in the route).
- (G5) Runtime tenant enforcement exists only in the builder core path (`verifyObjectGraph`/`planSite` via `/build/[siteId]`); that path is real, tested, and live.

Recommended follow-ups for the coordinator (not done here; read-only mandate): wire the scoped wrappers into the ask/overrides/projection routes or add route-level adversarial tests proving the raw stores are unreachable from request paths; add a request-body tenant-override test once a real acting-tenant identity exists.

## Evidence files (this dir)

- `report.md` (this file)
- `builder-jest.log` (full verbose builder suite output)
- `tenant-jest.log` (full verbose tenant suite output)
- `laneT-staged-jest.log` (scratch-config /tmp run of the staged Lane T bytes)
