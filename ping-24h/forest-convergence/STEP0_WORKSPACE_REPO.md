# STEP0 — Workspace repo inventory (FYD product surface, read-only)

Repo: `/home/nolan/workspace` on the Pig (Windows WSL), accessed read-only via
`ssh -F ~/.ssh/pig-config pigwsl 'wsl -- bash -c "<cmd>"'`. No checkouts, no writes,
no git state changes performed. All inspection via `git ls-tree`, `git log`,
`git grep`, `git cat-file` against branch tips only.

Date of inventory: 2026-09-28 ~18:30-18:45 MDT.

## BRANCHES (full list, verbatim from `git branch -a`)

Local branches:
- `+ audit/beyond-backlog-2026-09-19`
- `burn/orca-f04-2026-09-27`
- `burn/orca-f06-2026-09-27`
- `burn/outreach-caps-2026-09-27`
- `feat/orca-unknown-outcome-port` (decision-surface; inventoried by sibling track — not re-done)
- `fix/broker-failclosed-containment`
- `+ fix/gap1-f2-absorb-floats`
- `fyd/builder-rebuild-v1` (BROKEN REF — see failures)
- `fyd/builder-rebuild-v1-cherrypick`
- `jev/shadow-recorder` (decision-surface; sibling track)
- `lane-c/orca-adapter-2026-09-26`
- `lane-f-probe-staleness-fix`
- `lane-f/harness-2026-09-26`
- `master`
- `mc/approval-request` (decision-surface; sibling track)
- `mc/audit-payload-lifecycle`
- `mc/consequence-policy-input`
- `mc/frontdoor-hardening`
- `mc/fyd-shapeA-site-console`
- `mc/lane-c-reconcile-gate` (decision-surface; sibling track)
- `+ mc/mission-budgets`
- `mc/mission-intent-frontdoor`
- `+ mc/pass-migration-proof`
- `mc/pass-migration-supersession`
- `mc/sprint-integration-2026-09-27`
- `mc/tenant-hardening`
- `+ mc/tenant-hostile-tests`
- `orca-engagement-pipeline-endgame`
- `p0/approval`
- `p0/front-door-idempotency`
- `* security/secret-redaction-2026-09-28` (current checkout)
- `spine/x-pass-reached-path`
- `stream-b/composeview-visibility`
- `stream-b/publicgraphof-visibility`
- `+ substrate/gap1-F1-lane-e-floats`
- `substrate/gap1-F6-lane-e-keyorder`
- `substrate/gap1-canonical-conformance`
- `+ substrate/gap2-provenance-ref`
- `substrate/gap3-journal-identity`
- `+ substrate/gap4-binding-lint`
- `+ substrate/gap5-probe-health`
- `+ track-a/d1-monitors`
- `+ track-a/d2-schedule`
- `+ track-a/d3-igprefilter`
- `+ track-a/d4-spool`
- `trackc/tenant-prep-2026-09-27`

Remote branches:
- `remotes/origin/feat/orca-unknown-outcome-port`
- `remotes/origin/fyd-deploy`
- `remotes/origin/main`

Current branch: `security/secret-redaction-2026-09-28`
HEAD: `965289637c8eeb46c43f4adef33ac8e78ab00448`

## WORKTREES / DIRTY

`git worktree list` (verbatim; note paths are Pig-home `/home/hatch/...` forms):
- `/home/nolan/workspace` 9652896 [security/secret-redaction-2026-09-28]
- `/home/hatch/falsify-consequence-55b5d89` 55b5d89 (detached HEAD) prunable
- `/home/hatch/repair-consequence` db78888 (detached HEAD) prunable
- `/home/hatch/workspace/.worktrees/ar-cac` cacf7b2 (detached HEAD) prunable
- `/home/hatch/workspace/.worktrees/fd537` 537d264 (detached HEAD) prunable
- `/home/hatch/workspace/.worktrees/gap1-f1` 9d42351 [substrate/gap1-F1-lane-e-floats] prunable
- `/home/hatch/workspace/.worktrees/gap2-provenance` 62d3314 [substrate/gap2-provenance-ref] prunable
- `/home/hatch/workspace/.worktrees/substrate-gap4` e7c0ccf [substrate/gap4-binding-lint] prunable
- `/home/hatch/workspace/.worktrees/substrate-gap5` 49febc1 [substrate/gap5-probe-health] prunable
- `/home/hatch/workspace/.worktrees/tenant-hostile` a65846d [mc/tenant-hostile-tests] prunable
- `/home/hatch/workspace/track-a/d1-monitors/replay` 98ba0db (detached HEAD) prunable
- `/home/hatch/workspace/track-a/d1-monitors/work` 98ba0db [track-a/d1-monitors] prunable
- `/home/hatch/workspace/track-a/d2-schedule/replay` 36ae804 (detached HEAD) prunable
- `/home/hatch/workspace/track-a/d3-igprefilter/replay` c4425fc (detached HEAD) prunable
- `/home/hatch/workspace/track-a/d3-igprefilter/work` c4425fc [track-a/d3-igprefilter] prunable
- `/home/hatch/workspace/track-a/d4-spool/replay` 77f9776 (detached HEAD) prunable
- `/home/hatch/workspace/track-a/d4-spool/work` 77f9776 [track-a/d4-spool] prunable

Working tree is HEAVILY DIRTY: `git status --porcelain` = **1777** changed/untracked paths.
Modified FYD-relevant files include `fyd-product-lane/src/fyd/ask/__tests__/services-evidence.test.ts`,
`fyd-product-lane/src/fyd/customize/README.md`, `lane-p01/tree/src/fyd/ask/context-builder.ts`,
`lane-p01/tree/src/fyd/ask/types.ts`, `lane-p01/tree/src/fyd/lineage/tracer.ts`,
`lane-p01/tree/src/fyd/net/safe-fetch.ts`, `lane-p01/tree/src/fyd/proceduralize/STRUCTURED-DATA.md`,
`lane-p01/tree/src/fyd/proceduralize/proceduralizer.ts`,
`lane-p01/tree/src/fyd/proceduralize/structured-data.ts`, plus deleted
`lane-p01/tree/src/fyd/components/registry.ts.bak` and three media manifests.
(Dozens of untracked top-level dirs: acquisition-seam/, agents/, audit-driver*.js,
INTEGRATION-*.md, Dockerfile.gateway.fixed, etc. Full list not reproduced here.)

## FYD-RELEVANT PATHS PER BRANCH

Most branches share one baseline tree containing `fyd-lane/` (lane-f probe harness +
review/STATE.json) and `fyd-product-lane/` (the product library). The table notes
each branch's FYD-relevant top-level dirs and its delta, if any.

| Branch | Last commit(s) (`git log --oneline -3` / -1) | FYD-relevant paths / delta |
|---|---|---|
| `mc/fyd-shapeA-site-console` | `7a7a892` shapeA: tenant-scoped MC dispatch console (sites/[slug]/mission-control + api/sites/[slug]/mc); `b133d5a` shapeA baseline: website tree exemplar (lane-p01/tree, untracked copy); `d571362` backlog: RE-VERIFIED OPEN notes 2026-09-27 (FYD-010 probe, FYD-012 lint) | Baseline + `lane-p01/tree/` (full website exemplar: src/fyd/{sitespec,binding-verifier,claim,components,customize,media,ask,owner-mode}, src/app/api/fyd/* incl. projection/customize/claims, src/app/api/sites/[slug]/mc/* dispatch console, src/app/sites/[slug]/mission-control/*). |
| `p0/approval` | `b96e7d2` P0 W4: harvest ApprovalRequest primitive + proposal validator + approval CLI; `f4927a9` p0: reconstruct lane-d adapter-call.js shim + W2 proof notes; `f6a9302` p0: idempotent MC dispatch front door (lookup-before-mint) | Baseline + `lane-p01/tree/` + UNIQUE: `mission-control/approval_request.py` (498 lines), `approval_cli.py`, `adapters/chat_approval.py`, `adapters/mc_approval.py`, `proposal_record.py`, `proposal_validate.py` (381 lines), `emit.py`, `lane-d/adapter-call.js`, tests. No sites/[slug]/mc console (that is shapeA-only). |
| `security/secret-redaction-2026-09-28` (current HEAD) | `9652896` P0-SECRET-01: secret-class redaction for worker prompt construction; `cf4442f` backlog: FYD-012 residual CLOSED (5a9c86f landed, lint PASS); objectgraph-relate probe+patch delivered; `b96e7d2` P0 W4: harvest ApprovalRequest primitive + proposal validator + approval CLI | Baseline + `lane-p01/tree/` + the p0/approval mission-control approval files (b96e7d2 is an ancestor). |
| `remotes/origin/fyd-deploy` | `ade4ee5` FYD UI deploy: base 0dec40f5 + narrow /build/* restriction; `0dec40f` FYD-001: update hero badge assertions for honest claim labels; `e7ae22b` FYD-001: update object-scope tests for real service objects | DIFFERENT TREE (Next.js deploy app, no fyd-product-lane/): `src/app/api/fyd/{ask,auth,customize,projection,claims,media,objects,onboarding,social,...}`, `src/fyd/{ask,claim,components,customize,identity,media,object,onboarding,owner-mode,proceduralize}`, `src/app/build/[siteId]/owner-panel.tsx`, `portal-proof/`, `public/fyd-media/` (hashed media), `quarantine-fyd-media/`, `fyd-deploy-manifest.json`. Mirrors lane-p01/tree's FYD surface. |
| `mc/sprint-integration-2026-09-27` | `d571362` backlog: RE-VERIFIED OPEN notes 2026-09-27; `470745b` Sprint integration: front-door + tenant hardening with 4 defect closures; `473ff7c` backlog: triage visibility-customize-dangling-import + objectgraph-relate-output-dropped | Baseline + `lane-p01/tree/` + `mission-control/` (no approval_request.py; has idempotent front-door work). |
| `master` | `f9a4a42` backlog: FYD-037 falsification evidence 2026-09-23 (wrong-journal gap reproduced on inspectable emit path); `dc0f174` backlog: FYD-034 inspection recorded, DEFERRED per directive 11; `56f164e` backlog: renderer-javascript-url-sink DONE_VERIFIED 2026-09-23 (16/16 safe-link tests PASS + static href-sink audit) | `fyd-lane/` + `convergence/` only. NO `fyd-product-lane/`, NO `lane-p01/`, NO `mission-control/`. Oldest FYD surface. |
| `spine/x-pass-reached-path` | `df91b4e` spine lane phase 1: X-pass reached-path observation -> event -> query -> projection; `f980649` Engagement pipeline endgame: 9-stage spec + deterministic policy engine (SAFE subset); `85faad1` backlog: FYD-010/FYD-012 falsification evidence 2026-09-26 (ask field-gate absent; live renderer has zero binding-verifier call sites) | Baseline + `lane-p01/tree/` + `mission-control/`. Carries the key reached-vs-declared falsification evidence (see below). |
| `mc/frontdoor-hardening` | `537d264` Repair D1: idempotency collision covers full canonical intent bytes; tenant-scoped reference key; D2 support-file provenance | Baseline + `lane-p01/tree/` + `mission-control/`. |
| `mc/mission-intent-frontdoor` | `537d264` (same Repair D1); `f7262f7` MissionIntent front door: narrow dispatch contract (validate -> authorize -> dispatch -> observe) | Baseline + `lane-p01/tree/` + `mission-control/`. |
| `mc/tenant-hardening` | `38c7ad0` Tenant-hardening: front-door + approval tenant semantic unit; `bb4d5f3` Merge certified ApprovalRequest lane @ cacf7b2 into mc/tenant-hardening; `ddd60eb` Harden MissionIntent front door: honest executor outcomes (H2a/H5b) and revocation (H7) | Baseline + `lane-p01/tree/` + `mission-control/`. Merged ApprovalRequest lane @ cacf7b2 (note: cacf7b2 also appears as a detached prunable worktree). |
| `mc/mission-budgets` | `f336c80` mc/mission-budgets: repair falsifier FAIL defects | `fyd-lane/` + `convergence/` + `orca-mc-convergence/` only. NO `fyd-product-lane/`. |
| `mc/audit-payload-lifecycle` | `ba653ac` backlog: visibility-composeObjectView-bypass falsification evidence + verified patch (2026-09-26) | Baseline (`fyd-product-lane/` present), no lane-p01. |
| `mc/consequence-policy-input` | `db78888` mc/consequence-policy-input: fail closed on conflicting money signals + evidence/doc fixes | Baseline, no lane-p01. |
| `mc/pass-migration-proof` | `28c92f4` pass migration proof: one X pass as mission, 9-condition proof cycle | Baseline, no lane-p01. |
| `mc/pass-migration-supersession` | `d7b10a8` P3 supersession: wire STUBS.md _try_import hooks to real sibling lanes | Baseline, no lane-p01. |
| `mc/tenant-hostile-tests` | `a65846d` mc/tenant-hostile-tests: hostile tenant-isolation suite (25 tests) | Baseline, no lane-p01. |
| `trackc/tenant-prep-2026-09-27` | `473ff7c` backlog: triage visibility-customize-dangling-import + objectgraph-relate-output-dropped | Baseline, no lane-p01. |
| `burn/orca-f04-2026-09-27` | `61a6e45` burn: ORCA F-04 fix — verify_in_sent exact subject equality + regression tests | Baseline, no lane-p01. |
| `burn/orca-f06-2026-09-27` | `3b47bb4` burn: ORCA F-06 coordinated contract — add assertProbeSuccess, pin assertProbeEvidence | Baseline, no lane-p01. |
| `burn/outreach-caps-2026-09-27` | `98f0915` burn: fix stale Instagram cap snapshot (50/12 -> 55/15 ramped) | Baseline, no lane-p01. |
| `audit/beyond-backlog-2026-09-19` | `38535ea` audit: beyond-backlog constitutional findings 2026-09-19 | `BACKLOG.md` + `audit_reports/` only. No FYD code. |
| `fix/broker-failclosed-containment` | `da64baa` broker: fail-closed execution-identity allowlist (identity_1..4 only) | Baseline, no lane-p01. |
| `fix/gap1-f2-absorb-floats` | `2fa9c9b` Gap-1 F2: absorb/canonical.ts refuses all floats (pinned FLOATS_REFUSED) | Baseline, no lane-p01. |
| `lane-c/orca-adapter-2026-09-26` | `d5d56bc` lane-c: thread event.tenant_id through adapter into evidence (lane B handoff) | Baseline, no lane-p01. |
| `lane-f-probe-staleness-fix` | `af001e3` fix: lane-f-probe.py September stalenesses (node resolution, pg path, POSTGRES_* env) | Baseline, no lane-p01. |
| `lane-f/harness-2026-09-26` | `b7bfbcd` lane-f: integration harness 9/9 PASS (2026-09-26) | Baseline, no lane-p01. |
| `stream-b/composeview-visibility` | `a904906` object-lane: route composeObjectView through journaled field-visibility decisions | Baseline, no lane-p01. Commit message references "journaled" decisions but the tree has NO journal implementation (only the ask stub-journal.ts test stub). |
| `stream-b/publicgraphof-visibility` | `eff0ab4` ask-lane: wire journaled field-visibility decisions into publicGraphOf | Baseline, no lane-p01. Same journal caveat. |
| `orca-engagement-pipeline-endgame` | `f980649` Engagement pipeline endgame: 9-stage spec + deterministic policy engine (SAFE subset) | Baseline, no lane-p01. |
| `substrate/gap1-F1-lane-e-floats` | `9d42351` substrate Gap 1 F1: lane-e/proof.py::canon refuses floats per pinned FLOATS_REFUSED | Baseline, no lane-p01. Journal-adjacent names only. |
| `substrate/gap1-F6-lane-e-keyorder` | `c49e892` substrate Gap 1 F6: lane-e/proof.py::canon sorts keys in UTF-16 code-unit order per pinned KEY_ORDER_UTF16 | Baseline, no lane-p01. |
| `substrate/gap1-canonical-conformance` | `38cba5a` substrate Gap 1: ledger (GAP1-IMPL PARTIAL, 39 typed failing case-runs) | Baseline, no lane-p01. |
| `substrate/gap2-provenance-ref` | `62d3314` substrate/gap2: shared typed provenance authority (provenance-ref@1.0.0) | Baseline, no lane-p01. |
| `substrate/gap3-journal-identity` | `9da0ea9` Gap-1 F3: canonicalize key sort -> UTF-16 code-unit order | Baseline, no lane-p01. "journal" in branch name only; FYD surface has no journal impl. |
| `substrate/gap4-binding-lint` | `e7c0ccf` substrate/gap4: reusable presentation-binding lint core (F1/F2/F4/F5) | Baseline, no lane-p01. Commit message claims a reusable presentation-binding lint core — COMPETING binding-lint implementation (exact file path not verified; needs follow-up, not in FYD dirs). |
| `substrate/gap5-probe-health` | `49febc1` gap5: typed probe health envelopes + demo-half retarget to live JSONL gateway | Baseline, no lane-p01. "JSONL gateway" per commit message; not located in FYD surface. |
| `track-a/d1-monitors` | `98ba0db` Track A D1: typed gateway monitor semantics (HEALTHY/UNHEALTHY/UNKNOWN) | Baseline, no lane-p01. (Branch name collides with in-tree dir; used `refs/heads/` to resolve.) |
| `track-a/d2-schedule` | `36ae804` Track A D2: R7 live schedule source of truth (scheduler-tick-coverage.py) | Baseline, no lane-p01. |
| `track-a/d3-igprefilter` | `c4425fc` Track A D3: Instagram pre-filter fail-closed with zero wasted API calls | Baseline, no lane-p01. |
| `track-a/d4-spool` | `77f9776` Track A D4: durable OBSERVATION_CREATED spool with probe-before-POST | Baseline, no lane-p01. |
| `fyd/builder-rebuild-v1` | UNRESOLVABLE (broken ref; see failures) | Unknown — object missing. |
| `fyd/builder-rebuild-v1-cherrypick` | `8cc8291337795f74243e8809426324b5c3c316b6` (commit; message not captured) | Baseline (`fyd-lane/` + `fyd-product-lane/`), no lane-p01. |

Baseline definition (shared by ~30 branches): `fyd-lane/` =
`lane-f-failures.md`, `lane-f-findings.md`, `lane-f-probe.py`, `lane-f-replay-adapter.py`,
`lane-f-ui-compare.mts`, `review/STATE.json`; `fyd-product-lane/` = product library:
`src/fyd/{ask,customize,data,family,media,owner-mode,proceduralize,sitespec,tokens}`,
`src/app/{api/fyd/{ask,customize},sites/coppersmith-plumbing}`, `builder/tokens/*`,
`proof/*`. Verified identical file-for-file on the sampled branches (shapeA, p0/approval,
sprint-integration) for these dirs; only the branch-specific deltas above differ.

## COMPETING IMPLEMENTATIONS

Reached = imported by another in-tree file (verified via `git grep -l` on the branch).
Declared-only = present but no import call sites found / falsified by evidence.

| Unit | Branch | Path | Description | Reached or declared |
|---|---|---|---|---|
| Site-patch vocabulary | `origin/fyd-deploy`; also `mc/fyd-shapeA-site-console`, `p0/approval`, `security/secret-redaction-2026-09-28` (as `lane-p01/tree/src/fyd/ask/site-patch.ts`) | `src/fyd/ask/site-patch.ts` (14,021 bytes) | Digest-bound site_patch proposal drafting for Ask FYD: ordered list of SiteSpec transitions bound to the exact spec digest reasoned over; agent never mutates; human approves digest; applied via governed OBJECT_UPDATED event path. Exports SitePatchOperation / SitePatchPayload types (from `lib/ping/types`). | REACHED — imported by `src/fyd/ask/answer.ts`, `src/fyd/ask/site-spec.ts`, `src/app/api/ping/proposal/route.ts`, plus tests. |
| SiteSpec (impl #1, product lib) | all baseline branches | `fyd-product-lane/src/fyd/sitespec/{types.ts, validator.ts, intent-guards.ts}` | SiteSpec types, validator, intent guards. | REACHED — imported by `customize/route.ts`, `ask/visitor-answer.ts`, `customize/{propose,apply-layer,intent,server}.ts`, proof scripts. |
| SiteSpec (impl #2, exemplar) | `mc/fyd-shapeA-site-console`, `p0/approval`, `security/secret-redaction-2026-09-28` | `lane-p01/tree/src/fyd/sitespec/{binding-verifier.ts, contract-digests.ts, field-visibility.ts, ...}` + 15 test files (`binding-verifier.test.ts`, `bindings.test.ts`, `determinism-probe.ts`, `field-visibility.test.ts`, `graph.test.ts`, `render-model.test.ts`, `safe-link.test.ts`, `schemas.test.ts`, `site-metadata-verifier.test.ts`, `site-visibility-bridge.test.ts`, `spec-compat.test.ts`, `validator.test.ts`, `verified-render-model.test.ts`, `owner-visibility-tristate.test.ts`) | Binding verifier + contract digests + field visibility + render-model verification for the website exemplar. | MIXED — heavily tested, but spine/x-pass-reached-path commit `85faad1` (2026-09-26) records falsification evidence: "live renderer has zero binding-verifier call sites" → binding-verifier is DECLARED-ONLY in the live renderer path as of that evidence. |
| SiteSpec (impl #3, deploy) | `origin/fyd-deploy` | `src/fyd/ask/site-spec.ts` (+ `src/fyd/ask/types.ts`) | SiteSpec as seen by Ask FYD on the deployed UI; consumes site-patch. | REACHED — referenced alongside site-patch.ts in ask module. |
| Projection dump / materializer | `mc/fyd-shapeA-site-console`, `p0/approval`, `security/secret-redaction-2026-09-28`, `origin/fyd-deploy` | `lane-p01/tree/src/app/api/fyd/projection/route.ts` (and `origin/fyd-deploy:src/app/api/fyd/projection/route.ts`) | HTTP projection route for FYD sites. | Declared (route wiring; runtime behavior not verified). |
| Projection (claim machine) | same as above | `lane-p01/tree/src/fyd/claim/claim-projection.ts` (+ `machine.ts`, `store.ts`, `verification-seam.ts`, `identity.ts`, `resource-id.ts`) | Claim → projection state machine with hostile tests (`claim-projection-hostile.test.ts`, `attack-render-path.test.ts`, `attack-verifier-holes.test.ts`). | REACHED — imported by `app/api/fyd/claims/[resourceId]/{claim,release,verify,route}.ts`. |
| Projection (media authority) | same as above | `lane-p01/tree/src/fyd/media/authority-projection.ts` (+ `authority-binding.ts`) | Authority-scoped media projection. | File-level imports not exhaustively verified; sibling media files reference authority projections in tests (`authority-projection.test.ts`). |
| Projection (build script) | same as above | `lane-p01/tree/src/fyd/builder/dogfood/build-ping-fyd-projection.mjs` (+ `origin/fyd-deploy:src/fyd/builder/dogfood/build-ping-fyd-projection.mjs`) | Dogfood script that builds a PING FYD projection. | Declared (script; invocation not verified). |
| Projection (fixtures) | `origin/fyd-deploy` | `src/fyd/object/__tests__/fixtures/projections/{coppersmith-plumbing,happy-place}.json` | Materialized projection fixtures for tests. | Declared (test fixtures). |
| Journal gateway | — | NONE FOUND | No `journal/` implementation dir and no journal gateway file on any inventoried branch. Only: `lane-p01/tree/src/app/api/fyd/ask/__tests__/stub-journal.ts` and `lane-p01/tree/src/fyd/tenant/__tests__/f-journal-privacy.test.ts` (test stubs). stream-b branch commit messages mention "journaled field-visibility decisions" but their trees contain no journal implementation. `substrate/gap3-journal-identity` / `substrate/gap5-probe-health` mention journal/JSONL gateway in commit messages only. master's `f9a4a42` is falsification evidence about a "wrong-journal gap", not an implementation. | DECLARED-ONLY (stubs) / ABSENT. This is a genuine gap vs the convergence units. |
| Approval flow (MC primitive) | `p0/approval`, `security/secret-redaction-2026-09-28` (ancestor `b96e7d2`), `mc/tenant-hardening` (merged lane @ cacf7b2) | `mission-control/approval_request.py` (498 lines), `approval_cli.py` (117), `adapters/chat_approval.py`, `adapters/mc_approval.py`, `proposal_record.py` (101), `proposal_validate.py` (381), `emit.py` | ApprovalRequest primitive + proposal validator + approval CLI (Python, Mission Control side). | REACHED within mission-control (tests: `test_approval_request.py` 422 lines, `test_proposal_validate.py` 150 lines). |
| Approval flow (owner proposal) | `mc/fyd-shapeA-site-console`, `p0/approval`, `security/secret-redaction-2026-09-28` | `lane-p01/tree/src/fyd/customize/{owner-proposal.ts, owner-command-compiler.ts, write-boundary.ts}` + `lane-p01/tree/src/app/api/ping/proposal/route.ts` | Owner proposal drafting + command compiler + write boundary; ping proposal API route. | REACHED (proposal route exists; site-patch.ts importers include the proposal route). |
| Approval flow (customize apply) | all baseline branches | `fyd-product-lane/src/fyd/customize/{propose.ts, apply-layer.ts, intent.ts, server.ts, types.ts, hero-media.ts}` + `src/app/api/fyd/customize/route.ts` | Proposal → apply-layer flow for site customization. | REACHED — imported by customize route and data sources (`fyd-tenant-graph.ts`, `ping-object-source.ts`). |
| Approval flow (owner-mode gates) | all baseline branches (+ deploy variant) | `fyd-product-lane/src/fyd/owner-mode/{gate.ts, attestation-gate.ts, capability.ts, demo-chain.ts, customize-panel.tsx, demo-owner-mode.tsx}`; deploy: `src/app/build/[siteId]/owner-panel.tsx`, `src/fyd/owner-mode/demo-chain.ts` | Owner-mode gating, attestation, capability checks, demo chain. | REACHED — imported by customize route, claims routes, `overrides/owner-context.ts`, objects-lab pages. |
| Site renderer | `mc/fyd-shapeA-site-console`, `p0/approval`, `security/secret-redaction-2026-09-28`, `origin/fyd-deploy` | `lane-p01/tree/src/fyd/components/renderer.tsx` (+ `registry.ts`, `registry.ts.bak`, `compose-motion.ts`, `object-rail.tsx`, `object-overlay.tsx`, `object-affordance.tsx`, `viewport.tsx`, `hero-section.tsx`, `contact-link.tsx`, `ask-fyd-widget.tsx`); deploy mirror at `origin/fyd-deploy:src/fyd/components/renderer.tsx` | The FYD site renderer + component registry. | REACHED (render tests: `render.test.ts`, `compose.test.ts`, `ping-fyd-dogfood.test.ts`, `projection-boundary.test.ts`; but see the binding-verifier zero-call-site falsification above). |
| Site renderer (family) | all baseline branches | `fyd-product-lane/src/fyd/family/{family-page.tsx, registry.tsx, hierarchy.ts, bindings.ts, motion.tsx, shared.tsx, surfaces.tsx, components/AskFYD.tsx, BusinessStory.tsx, ContactCTA.tsx, FeaturedService.tsx, Footer.tsx, Hero.tsx, Navigation.tsx, ProjectGallery.tsx, ServiceArea.tsx, ServiceGrid.tsx, TrustBar.tsx}` | Family component set (coppersmith-plumbing v2 site: `src/app/sites/coppersmith-plumbing/v2/page.tsx`, `family-input.ts`; proof: `proof/coppersmith-family-2026-09-25/`). | REACHED — page.tsx + family-input.ts + family-generation tests wire it. |
| Binding lint (competing) | `substrate/gap4-binding-lint` | Commit `e7c0ccf`: "reusable presentation-binding lint core (F1/F2/F4/F5)" — exact file path NOT verified (branch tree is the FYD baseline; the lint core lives outside the FYD dirs) | Claimed reusable binding-lint core, parallel to sitespec/binding-verifier.ts. | UNVERIFIED location; treat as candidate competing implementation needing a targeted follow-up. |
| Tenant dispatch console | `mc/fyd-shapeA-site-console` only | `lane-p01/tree/src/app/api/sites/[slug]/mc/{dispatch/route.ts, missions/route.ts, _lib/site-dispatch.ts (857 lines)}` + `src/app/sites/[slug]/mission-control/{page.tsx, dispatch-console.tsx (219)}` | Tenant-scoped Mission Control dispatch console (shapeA's headline feature; removed in the p0/approval direction per diff). | Declared (shapeA-only; diff shows it deleted on the p0/approval side). |

## OVERLAP WITH CONVERGENCE UNITS

- **Proceduralizer**: `fyd-product-lane/src/fyd/proceduralize/{proceduralizer.ts, planner.ts, generator.ts, presentation-observe.ts}` + `STRUCTURED-DATA.md` + `ACQUISITION-STACK.md` (deploy). REACHED by customize route, `family-input.ts`, proof scripts (`proof/coppersmith-family-2026-09-25/run.ts`, `proof/owner-mode-proof.ts`). Present on all baseline branches.
- **SiteSpec generator**: THREE parallel implementations — (1) `fyd-product-lane/src/fyd/sitespec/` (types/validator/intent-guards, REACHED); (2) `lane-p01/tree/src/fyd/sitespec/` (binding-verifier/contract-digests/field-visibility, heavily tested but binding-verifier has zero live-renderer call sites per 2026-09-26 falsification evidence); (3) `origin/fyd-deploy:src/fyd/ask/site-spec.ts` (deploy ask-side spec). Convergence should pick one.
- **Renderer / components**: TWO parallel sets — `fyd-product-lane/src/fyd/family/components/*` (11 trade-site components, REACHED) and `lane-p01/tree/src/fyd/components/*` (renderer.tsx + registry + object rail/overlay/affordance, REACHED). Both live.
- **Binding verifier**: `lane-p01/tree/src/fyd/sitespec/binding-verifier.ts` exists and is tested, but is DECLARED-ONLY in the live renderer path (evidence: `85faad1` on `spine/x-pass-reached-path`). Plus an unverified competing "reusable presentation-binding lint core" claimed on `substrate/gap4-binding-lint` (`e7c0ccf`).
- **Proposal / approval**: FOUR layers that must converge — MC Python primitive (`mission-control/approval_request.py` + `proposal_validate.py` + CLI; p0/approval + current HEAD), owner-proposal TS flow (`lane-p01/tree/src/fyd/customize/owner-proposal.ts` + proposal route), customize propose/apply-layer (`fyd-product-lane/src/fyd/customize/`), owner-mode gates (`fyd-product-lane/src/fyd/owner-mode/`). The digest-bound site_patch (agent drafts → human approves digest → governed OBJECT_UPDATED) is the shared approval semantic.
- **Projection regeneration**: projection API route + claim-projection machine (REACHED by claims routes) + media authority-projection + dogfood build script + deploy fixtures. No single "regenerate projection" entry point identified; regeneration is spread across route/machine/script.
- **Ask FYD**: TWO parallel ask stacks — `fyd-product-lane/src/fyd/ask/{visitor-answer.ts, visitor-safe-fields.ts}` + `app/api/fyd/ask/ask-pipeline.ts` (product-lib side, REACHED) and `lane-p01/tree/src/fyd/ask/` / `origin/fyd-deploy:src/fyd/ask/` (`answer.ts`, `site-patch.ts`, `site-spec.ts`, `context-builder.ts`, `envelope.ts`, `capabilities.ts`, `fyd-circle.tsx`, REACHED). `ask-fyd-widget.tsx` component exists in both trees.
- **Demo routes**: `src/app/api/fyd/onboarding/preview/route.ts` + `src/fyd/onboarding/anonymous-preview.ts` + `extractor.ts`; `src/fyd/owner-mode/demo-chain.ts` + `demo-owner-mode.tsx`; `src/app/dev/objects` (objects-lab); `src/fyd/identity/__tests__/demo-owner-path.test.ts`. Present on lane-p01 branches and origin/fyd-deploy.

## FAILURES / CAVEATS (recorded, moved on)

1. `fyd/builder-rebuild-v1` is a BROKEN REF: `git show-ref` → "bad ref refs/heads/fyd/builder-rebuild-v1
 (49e821bf8b712b22153f367a166a519dce3277ab)"; the commit object is absent from the
 object store (`git cat-file -t` → "could not get object info"; `git log` → "fatal: bad
 object"; `git ls-tree` → "fatal: not a tree object"). Its contents are uninspectable
 from this repo. Its sibling `fyd/builder-rebuild-v1-cherrypick` (`8cc8291337795f74243e8809426324b5c3c316b6`)
 resolves fine and contains the standard baseline tree (fyd-lane + fyd-product-lane, no lane-p01).
2. `track-a/*` branch names collide with in-tree directories (`track-a/d1-monitors` etc.);
 `git log` required the `refs/heads/` prefix to disambiguate.
3. Transport quoting constraints on the Pig path (Windows CMD inside `wsl -- bash -c "..."`):
 bare `|` and `$var` are consumed by CMD; working forms were `\$var` for loop variables
 and dumping `git ls-tree -r` output to a local file for local `grep` instead of remote pipes.
 `^{tree}` must be written `^^{tree}`.
4. Reached-vs-declared judgments are import-graph-level (`git grep -l` on the branch tip),
 not runtime-verified. Runtime wiring (which route actually serves) was not checked.
5. `substrate/gap4-binding-lint`'s claimed "reusable presentation-binding lint core" was NOT
 located — its tree is the FYD baseline, so the core lives outside the FYD dirs. Needs a
 targeted follow-up if the convergence pass wants to compare it against
 `sitespec/binding-verifier.ts`.
6. No journal gateway implementation exists anywhere in the FYD surface (stubs only).
 If the convergence units require one, it is a genuine gap, not a hidden duplicate.
7. Working tree has 1777 dirty/untracked paths on the current checkout; the inventory above
 describes branch TIPS, not the dirty working tree.
