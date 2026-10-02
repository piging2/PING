# PATCH INTEGRATION REPORT
FYD FACTORY 24-hour program, PATCH INTEGRATION worker
Run: 2026-09-24 ~05:08-05:22 MDT (11:08-11:22 UTC)
Target: /home/nolan/projects/ping on the Pig, branch fyd-factory, HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0
Repo state: dirty checkout, 108 dirty files at start, 120 at end. No commits, no pushes, no checkout/reset/clean at any point. All patches applied with git apply only.

## Per-patch status

All 22 coordinator patches APPLIED (git apply --check passed, then git apply). Zero REJECTED. One patch intentionally skipped per instructions.

| # | Patch | Status | Files touched |
|---|---|---|---|
| SEC-1 | o-capability-safe-link.patch | APPLIED | src/fyd/object/view.ts |
| SEC-2 | o-contact-block-safe-link.patch | APPLIED | src/app/o/[objectId]/page.tsx |
| SEC-3 | display-media-src-allowlist.patch | APPLIED | src/fyd/media/select.ts |
| SEC-4 | export-customer-data-script-escape.patch | APPLIED | src/fyd/boundary/data-boundary.ts |
| SEC-5 | safe-link-email-shape-tighten.patch | APPLIED | src/fyd/sitespec/safe-link.ts |
| G1 | concierge-buildgraphview-visibility-filter.patch | APPLIED | src/fyd/ask/concierge.ts (untracked lane file) |
| TD-002 | ask-concierge-wire.patch | APPLIED | src/fyd/ask/answer.ts |
| RAIL-1 | object-rail-binding-gate.patch | APPLIED | src/fyd/components/renderer.tsx |
| RAIL-2 | 0001-rail-bound-description.patch | APPLIED | src/fyd/components/object-rail.tsx |
| (skip) | 0002-rail-section-bound-summary.patch | SKIPPED (superseded by RAIL-1 on same lines, per task) | - |
| PHONE | 0002-object2-phonec-dial-gating.patch | APPLIED | src/fyd/components/renderer.tsx |
| SYNTH-1 | synth-shard0-overlay-orphan-ambiguity.patch | APPLIED | src/fyd/object/owner-overlay.ts |
| SYNTH-2 | synth-shard0-overlay-drift-normalization.patch | APPLIED | src/fyd/object/owner-overlay.ts |
| SYNTH-3 | synth-shard0-visibility-hide-reresolve.patch | APPLIED | src/fyd/owner-mode/visibility-policy.ts |
| WIRE-1 | sites-wire-p1-footer-provenance.patch | APPLIED | src/app/sites/_shared/site-client.tsx |
| WIRE-2 | sites-wire-p2-rights-inferred.patch | APPLIED | src/fyd/components/renderer.tsx |
| WIRE-4 | sites-wire-p4-render-audit.patch | APPLIED **with defect** (see DEFECT-1) | src/app/sites/coppersmith-plumbing/page.tsx, src/app/sites/happy-place/page.tsx, src/fyd/sitespec/sites-render-audit.ts (new) |
| WIRE-5 | sites-wire-p5-verifier-reconciliation.patch | APPLIED | src/fyd/components/renderer.tsx, src/fyd/sitespec/binding-verifier.ts, src/fyd/sitespec/graph.ts |
| VQ-001 | vq-001-motion-never-gates-content.patch | APPLIED (apply --check passed despite the motion-CSS caveat; no conflict materialized) | src/fyd/components/renderer.tsx, src/fyd/components/__tests__/mobile-visibility.test.ts (new) |
| VQ-002 | vq-002-hero-pill-on-dark.patch | APPLIED | src/fyd/components/renderer.tsx |
| VQ-004 | vq-004-typographic-hero-treatment.patch | APPLIED | src/fyd/components/renderer.tsx |
| M-2 | m-issue-2-fab-inflow-mobile.patch | APPLIED | src/fyd/components/object-rail.tsx |
| M-3 | m-issue-3-mobile-hero-call-cta.patch | APPLIED | src/fyd/components/renderer.tsx |
| INFRA | boundary-jest-css-stub.patch | APPLIED (test-config only, authorized to make the gauntlet run) | src/fyd/boundary/jest.config.cjs |

## Per-family test results

All commands run from repo root /home/nolan/projects/ping, node v22.23.2.

**SEC-FIX** (all green)
- `npx jest --config src/fyd/boundary/jest.config.cjs --ci` : 2/2 suites, 26/26 tests PASS (data-boundary 6 + projection-seam-attack gauntlet 20). Evidence for the stub: without it the gauntlet fails with `SyntaxError: Unexpected token '.'` on object-circle.module.css (imported via renderer); the stub mirrors the components lane mapping.
- `npx jest --config src/fyd/object/jest.config.cjs --ci` : 15/15 suites, 181/181 PASS.
- `npx jest --config src/fyd/media/jest.config.cjs --ci` : 14/14 suites, 149/149 PASS.
- `npx jest --config src/fyd/sitespec/jest.config.cjs --ci` : 10/10 suites, 92/92 PASS.

**CONCIERGE + ASK (TD-002)**
- `npx jest --config src/fyd/ask/jest.config.cjs --ci` : 10 suites, 158 tests: 141 pass, **17 fail**.
- Causal test (reversed both concierge patches with git apply -R, re-ran, re-applied): without my patches, 157/158 pass. The single remaining failure (context-compiler.test.ts "conflict/hours question binds both sides") is pre-existing in the dirty checkout and does not touch concierge code. **16 of the 17 failures are caused by the ask-concierge-wire patch**: it intentionally routes the seven canonical questions through the concierge, and the ask lane's tests assert the pre-wire behavior (representative: demo-classification expects claim basis "Demo content added by the site operator", concierge now grades "Derived from the site data"). Failing suites: route.test.ts, route-smoke.test.ts, object-scope.test.ts, ask-classes-tenant.test.ts, demo-classification.test.ts, services-evidence.test.ts, and the 200-response FL test. This is a behavior-change conflict for the coordinator and LANE-ASK to reconcile (update tests to concierge behavior, or revise the wire patch). I did not touch the tests. Patches left APPLIED per the coordinator's decision.

**RAIL + PHONE-DIAL + VQ**
- `npx jest --config src/fyd/components/jest.config.cjs --ci` : 9/9 suites, 93/93 PASS, including the new mobile-visibility.test.ts added by VQ-001.
- Phone-dial smoke: no phonec fixture exists anywhere in the tree (grep for "phonec" in fixtures and tests: zero hits), so the conditional smoke could not run. The contactMethod code path is covered by the object suite's contact-method-projection tests (181/181 pass).

**SYNTH**
- `npx jest --config src/fyd/customize/jest.config.cjs --ci` : 3/3 suites, 54/54 PASS (matches LANE-OWNER 54/54 baseline).
- `npx jest --config src/fyd/owner-mode/jest.config.cjs --ci` : 4/4 suites, 34/34 PASS (lane cited 24/24; suite has since grown to 34, all green).

**WIRE**
- `npx tsc --noEmit` (full repo): exit 1, **169 errors, all 169 in src/fyd/sitespec/sites-render-audit.ts** (the new file from WIRE-4). Zero type errors in any other file, including every other patch-touched file. See DEFECT-1.

**Full FYD safety loop** (all 21 jest configs, `npx jest --config <cfg> --ci`): everything green except ask (above), invariants (1 test, see below), and net (2 suites, see below). Totals: ~1500 tests, failures confined to the items documented here.

## DEFECT-1: WIRE-4 ships a syntax defect (APPLIED, but broken)

`sites-wire-p4-render-audit.patch` line 14 writes this comment line into the new file src/fyd/sitespec/sites-render-audit.ts (line 7):

` * pages (src/app/sites/*/page.tsx) call generateSiteSpec directly and never`

The `*/` inside `sites/*/page.tsx` prematurely terminates the file's opening block comment. tsc then parses the remaining English prose as code, producing all 169 repo type errors (TS1005/TS1434/TS1435 cascade from line 7 onward). This makes `npx tsc --noEmit` red for the whole repo. Jest suites still pass because no test imports the file and ts-jest compiles per file.

I did NOT hand-fix it: the patch is the artifact of record and a hand edit would break replayability. Recommended coordinator fix: issue a corrected WIRE-4 with the comment reworded to avoid `*/` inside a block comment (e.g. `src/app/sites/[site]/page.tsx`). One-line change, no behavior impact.

## Other-lane WIP notes (observed, not touched)

- **invariants lane**: `inv-05-url-schemes.test.ts` "documents the seam: observed values are interpolated raw into hrefs" now fails because SEC-1 closed the hole it documents (it asserts `href: "javascript:alert('xss-test')"` verbatim; buildCapabilities no longer passes it through). Expected consequence of the REQUIRED SEC fix; the sibling INVARIANT test ("every emitted capability href must be safe") passes. The doc test belongs to the security lane to update.
- **net/claim lane**: `attack-verifier-holes.test.ts` H1-H9 (11 tests) fail identically with WIRE-5 reversed, so not caused by my patches. The lane's own header states "Failing tests here are the deliverable: they name genuine holes." `attack-render-path.test.ts` fails to parse under the net config (no CSS stub in that config); the lane's header documents a custom run command with its own css-stub.js, a pre-existing infra gap. Both test files are new untracked lane files added after the 00:20Z baseline.
- **Concurrent lane activity**: the ask lane (context-compiler files) and secrets lane (src/lib/secrets/) were actively editing the tree during this run; this explains the ask suite growing from the LANE-ASK 152 baseline to 158. I modified none of their files (verified via mtime audit: every file I changed is in the patch file list).
- Dirty count: 108 at start, 120 at end. The delta is my 18 patch-touched files (several already dirty in the baseline, netting +12 new dirty entries: 16 tracked modifications + 2 new files) plus the concurrent other-lane files noted above.

## Escalation

None. No canonical corruption risk, no irreversible damage, no new P0. Everything applied is uncommitted and reversible with git apply -R. The two items needing coordinator action are DEFECT-1 (corrected WIRE-4 patch) and the ask wire-vs-tests behavior conflict (16 tests). Evidence files: [evidence-apply-results.txt](sandbox:/home/hatch/workspace/fyd-factory/patch-integration/evidence-apply-results.txt), [evidence-verify-results.txt](sandbox:/home/hatch/workspace/fyd-factory/patch-integration/evidence-verify-results.txt), [evidence-full-loop.txt](sandbox:/home/hatch/workspace/fyd-factory/patch-integration/evidence-full-loop.txt), [evidence-tsc-byfile.txt](sandbox:/home/hatch/workspace/fyd-factory/patch-integration/evidence-tsc-byfile.txt).

## ADDENDUM 2026-09-24 ~11:45 UTC (coordinator post-report verification)

### DEFECT-1 is CLOSED
Coordinator repaired directly on the Pig: canonical patch text fixed (`sites/[tenant]/page.tsx`), broken `src/fyd/sitespec/sites-render-audit.ts` removed and re-applied from the corrected patch (`--include` for the new file only; page.tsx hunks were already correct). tsc on the file: clean. Recorded as a coordination breach (edit made while the integration worker was still active); no conflicting writer overwrote it.

### Ask 16-failure root cause ISOLATED (corrects the report's attribution)
The report attributed the 16 failures to the wire patch's behavior change. Coordinator ran a two-way isolation on the Pig:
- G1 applied + wire reversed: **158/158 PASS** (zero regressions from G1)
- G1 reversed + wire applied: 16 failed / 142 passed
- Both applied: 17 failed / 141 passed

Conclusion: the wire patch (`ask-concierge-wire.patch`) causes the regressions, not G1. G1's visibility filter is clean against the full ask suite. The wire routes the seven canonical questions through the concierge whose answers do not match the established composer contracts (attribution vocabulary, refusal shapes, route expectations); the concierge's answers are less precise, not better. Per the coordinator's standing decision, **the wire patch is REVERSED and stays out** until LANE-ASK delivers a compatibility-safe seam. G1 stays applied (security fix, zero regressions). Current tree state: G1 in, wire out, ask suite 158/158 green.

### inv-05 test (confirmed)
`inv-05-url-schemes.test.ts` "documents the seam" asserts the pre-SEC-FIX-#1 vulnerability (`href: "javascript:alert('xss-test')"` verbatim). SEC-FIX #1 closed it. Repair: update the test to assert the closed behavior (zero `website` capabilities for the hostile value). Dispatched to the repair worker.

### concierge.ts TS2367 x4 (confirmed, pre-existing)
`sourceFor`/`basisFor`/`claimClassFor` compare `kind: ObjectProvenanceKind` against literals outside the union. Pre-existing in LANE-ASK's file. Note: the report's "zero type errors elsewhere" was from the tsc run dominated by the 169 P4 parse errors; current `tsc --noEmit` shows 8 errors (4 concierge + 4 secrets-lane WIP). Repair (minimal, no canonical-type change): annotate the three `kind` locals as `string`. Dispatched to the repair worker. Widening `ObjectProvenanceKind` (runtime also uses `"procedural-fixture"`, `"owner-presentation-intent"`) is a type-authority decision, out of scope.

### Pending (repair worker scope)
1. inv-05 test update (above).
2. concierge.ts TS2367 string annotation (above).
3. Bound-variant FIXED_OK re-run for the combined RAIL-1 + RAIL-2 patch set.
4. Re-run: `npx tsc --noEmit`, ask suite, invariants suite.
Out of scope: re-applying the wire patch (coordinator decision, LANE-ASK owns the redesign); modifying ask fixtures (proven clean); the 4 secrets-lane tsc errors (other lane's WIP); net CSS-transform failures (environmental).

## REPAIR LOG (repair worker 5bb95fdb, 2026-09-24 ~05:30 MDT)

Branch: fyd-factory, repo /home/nolan/projects/ping on the Pig. No commits, pushes, resets, or `git add -A` performed. All changes via direct file edits. The wire patch (`ask-concierge-wire.patch`) was NOT re-applied (coordinator decision stands). Ask fixtures untouched.

### REPAIR 1: inv-05 test asserted the old vulnerability (DONE)

File: `src/fyd/invariants/__tests__/inv-05-url-schemes.test.ts` (untracked, arrived via integration).

- Test "documents the seam: observed values are interpolated raw into hrefs" asserted `buildCapabilities` emitted `href: "javascript:alert('xss-test')"` verbatim. SEC-FIX #1 (2026-09-24) closed the seam: `buildCapabilities` in `src/fyd/object/view.ts` now routes the website value through `resolveSafeLink(value, "navigate")` and emits NO `website` capability unless the gate verdict is `safe`.
- Changed ONLY that test: renamed to "documents the seam: a hostile website value emits no website capability (SEC-FIX #1)"; now asserts `caps.find((c) => c.kind === "website")` is `undefined` for the hostile contact record. Sibling test "INVARIANT: every emitted capability href must be safe for its capability" left byte-identical. Also updated the file's header comment (it described the seam probe as "expected to FAIL"; now documents the closed behavior).
- Invariants suite before: 10 suites / 90 tests, 1 failure expected on the old assertion (the seam test failed against the fixed code). After: **10 suites / 90 tests, all pass** (`npx jest --config src/fyd/invariants/jest.config.cjs --ci`).

### REPAIR 2: concierge.ts TS2367 x4 (DONE)

File: `src/fyd/ask/concierge.ts` (untracked, LANE-ASK's file; pre-existing, not caused by integration).

- `sourceFor` (line 209), `basisFor` (line 219), `claimClassFor` (line 231) declared `const kind = prov?.kind ?? ""` where `kind: ObjectProvenanceKind` (`"canonical-journal" | "website-derived" | "overlay-authored"`), then compared against literals outside the union (`"owner"`, `"procedural-fixture"`, `"website-ingestion"`). Control-flow narrowing after the first two `if` returns left the type as `"website-derived"` (plus `""`), producing 4 TS2367 errors at lines 212, 213, 223, 234.
- Minimal fix only: annotated the three locals as `const kind: string = ...`. `ObjectProvenanceKind` NOT widened (type-authority decision, out of scope). Runtime behavior unchanged (annotation is type-only).
- Note: the repo-root `tsconfig.json` `include` does not cover `src/fyd`, so `npx tsc --noEmit` never reported these; verified with a scoped tsconfig covering `src/fyd/ask/concierge.ts` (strict, `@/*` paths): **4 errors before, 0 errors after** (tsc exit 0).
- Ask suite: **158/158 pass before and after** (`npx jest --config src/fyd/ask/jest.config.cjs --ci`), confirming no runtime regression.

### REPAIR 3: bound-variant FIXED_OK re-run for combined RAIL-1 + RAIL-2 (DONE)

RAIL-1 (`object-rail-binding-gate.patch`, `renderer.tsx`) + RAIL-2 (`0001-rail-bound-description.patch`, `object-rail.tsx`, `boundRailDescription` via `verifyPresentationBinding`) both applied in the tree.

- Reused the OBJECT lane's minimized check (`missions/object/shard-0/scratch/repro.ts`) rather than writing a new scratch test: esbuild-bundled it on the Pig (`.css` loader `empty`, `@` alias to `src`), ran the bundle with node against the lane's fixtures `missions/fixtures/rail-unbound-description.json` (service description with `provenance: null`, sentinel `REPRO UNBOUND CLAIM`) and `rail-bound-description.json` (provenance intact, sentinel `REPRO BOUND CLAIM`). Scratch bundle and fixtures lived only in the Pig's `/tmp/rail-fix/` and were deleted afterward; nothing left in the tree.
- Results against the combined patch set:
  - Unbound fixture: `unboundRendered: false` (binding gate rejects/fails-closed; no sentinel in rendered HTML).
  - Bound fixture: `boundRendered: true`, `unboundRendered: false`, verdict `FIXED_OK`; the bound sentinel renders 4 times in real generated HTML (object cards/sections), so the pass is not vacuous and there is no over-omit.
- Combined conclusion: **FIXED_OK re-confirmed for RAIL-1 + RAIL-2** (bound rail description renders for a bound object; the binding gate fails closed on the unbound variant). Baseline non-vacuity was established by the OBJECT lane (unpatched tree rendered the unbound sentinel, BUG_PRESENT).

### Final verification (all on the Pig, fyd-factory)

- `npx tsc --noEmit`: **only the 4 secrets-lane errors** in `src/lib/secrets/__tests__/secret-broker.redteam.test.ts` (TS2300 x2 duplicate `BrokerError`, TS2345 x2 missing `tenantId`); other lane's WIP, left untouched per task.
- `npx jest --config src/fyd/ask/jest.config.cjs --ci`: **10 suites, 158/158 pass**.
- `npx jest --config src/fyd/invariants/jest.config.cjs --ci`: **10 suites, 90/90 pass**.

### Failures not fixed

None in scope. The 4 `secret-broker.redteam.test.ts` type errors belong to another lane and were intentionally left alone. One tooling note for future workers: `pigwsl-run.sh` arguments are single-quote wrapped, so literal single quotes inside the command are silently eaten by the local shell (they terminate the quoting); escape them or avoid them. Also, Windows CMD command-line length limits apply to the base64-wrapped payload, so multi-KB file transfers should go via `scp -F /home/hatch/.ssh/pig-config` to `pigwsl:C:/Users/nolan/transfer/` instead of nested echo-through-pigwsl-run.
