# PING Implementation Forest Map (Lane B14)

One live convergence ledger across all worktrees. Purpose: every future
implementation WorkOrder queries this file first (CEO RULE ZERO: never
reimplement before searching the forest; if 70 percent exists,
finish/harvest/converge, do not rewrite).

Status: **HYPOTHESIS** until replayed from a clean checkout. All observations
are read-only: `git` reads over Pig WSL SSH (`pigwsl-exec.sh -s`), local
workspace repo reads, and B13's landed report. Nothing was modified,
committed, merged, reset, cleaned, or pushed. The gateway, the 3 jev-shadow
scheduler missions, and :3100 were not touched.

Observation window: 2026-09-28 ~15:15 to ~16:05 MDT (T+0.8 to T+1.7).
T+0 = 2026-09-28 14:26 MDT.

B13's dirty-tree report was consumed for all DIRTY ALTERNATIVES fields:
`~/workspace/ping-24h/lanes/laneB13-dirty-tree/report.md` plus
`dirty-tree.patch` (913 KB, 21,734 lines, preserved read-only).

## 1. TREE INVENTORY

### 1a. Canonical product tree (Pig WSL only; absent from this sandbox)

| Field | Value |
|---|---|
| Path | `/home/nolan/projects/ping` (Pig WSL) |
| HEAD | `0264d517ea53358d9246ddbbba66bb9dd0beb0d4` (2026-09-28 05:59:49 -0600) |
| Branch | `hardening/2026-09-28-vocab-ssrf`, upstream NONE |
| Dirty | 144 porcelain lines (74 modified tracked + 70 untracked), last writer 2026-09-27 22:58:43 MDT, no active writer for ~16.5h at observation time |
| Served state | :3100 serves `.next` build from 2026-09-27 21:00:32 (~18h stale at T+0); served != worktree != HEAD (lane 9) |
| Owner posture | ASSUME LIVE OWNED WORK (owner decision 2026-09-28 ~15:10 MDT). No merge/reset/clean over it |

### 1b. Patch branch (isolated, owner-authorized, stays isolated until gateway proof + reached-loop re-run)

| Field | Value |
|---|---|
| Branch | `decision-fabric/contextpack-wire-2026-09-28` @ `9a555021` (committed 2026-09-28 14:35:06 MDT, patch lane active today) |
| Worktrees | `/home/nolan/projects/ping-worktrees/contextpack-2026-09-28` (branch checkout, 1 dirty: tsbuildinfo), `/home/nolan/projects/ping-worktrees/contextpack-replay-2026-09-28` (detached), `/home/nolan/workspace/ping-24h/repro/laneB3-9a555021` (detached, lane B3 repro) |
| Content | 3 files, +327/-6: `src/app/api/mc/_lib/mc-context-pack.ts` (83 lines, `compileAskContext()`), `__tests__/mc-context-pack.test.ts` (214 lines), `src/app/api/mc/dispatch/route.ts` (+36/-6, wires the helper into the context-mint region) |
| Local skeleton | `/home/nolan/projects/ping-worktrees/contextpack-2026-09-28` in THIS sandbox is an empty `src/app` skeleton, not a git checkout. The real worktree is on the Pig. Do not mistake the skeleton for the patch |
| Overlap verdict (B13) | TEXTUAL OVERLAP with the dirty tree at the context-mint region, SEMANTIC EXTENSION, NO DUPLICATION. 3-way merge required when sequencing allows; the patch helper must take the dirty tree's tenant-aware `publishArtifact` signature |

### 1c. Pig worktrees of the canonical repo (57 total; frontier-relevant subset)

Merged-into-HEAD means converged already. Stranded means diverged, unmerged.

| Worktree | Branch @ HEAD | Merged into 0264d517? | Dirty | Last activity | Relevance |
|---|---|---|---|---|---|
| `/home/nolan/projects/ping-ask-loop` | `ask-loop/fyd-ask-behavior` @ 42f81d53 | YES (ancestor) | 12 | 2026-09-26 18:50 MDT | Stale ancestor checkout WITH uncommitted Ask FYD edits (see stranded register) |
| `/home/nolan/worktrees/lane-p01` | `fyd/lane-p01-presence-compiler` @ 2bf1e5c9 | YES (ancestor) | 1 | 2026-09-26 18:45 MDT | Stale ancestor; presence compiler merged to HEAD |
| `/home/nolan/worktrees/lane-fyd-010` | `lane/fyd-010-context-projection` @ 9f9b79f8 | YES (ancestor) | 0 | 2026-09-26 18:44 MDT | Stale ancestor; context projection merged to HEAD |
| `/home/nolan/build-workerE-intent` | `workerE/intent-move-first` @ 2aa7b1d2 | YES (ancestor) | 0 | 2026-09-25 | Stale ancestor; typed intent parser merged to HEAD |
| `/home/nolan/worktrees/workerF-edge-restore` | `workerF/edge-restore` @ 2839dd50 | YES (ancestor) | 1 | 2026-09-25 | Stale ancestor |
| `/home/nolan/worktrees/lane-e-ask` | detached @ e474c89b | UNKNOWN (detached) | 12 | 2026-09-24 | Old ask-lane work, superseded |
| `/home/nolan/projects/ping-wave-P-20260923-098` | `tenanos-wave/P-20260923-098-context-pack` @ 13f21b59 | NO (stranded) | 0 | 2026-09-23 | Tenanos memory context-pack assembler (NAMING COLLISION with patch, different semantics) |
| tenanos-wave P-089/091/092/095/100/103/104-105 | various @ see ledger | NO (stranded) | 0 | 2026-09-23 | Memory candidate, decision budget, tenant kit, run state, bootstrap, attempt fencing, security |
| `/home/nolan/worktrees/fyd-family-converge` | `fyd/builder-rebuild-v1` @ 4eb90401 | NO (stranded) | 1 | 2026-09-25 | Builder rebuild v1 + coppersmith family proof |
| `/home/nolan/worktrees/fix-evidence-ref` | `design/fix-evidence-ref-current` @ 4c947384 | NO (stranded) | 1 | 2026-09-26 20:13 MDT | Evidence-ref stamping + render-projection + theme system (+6820/-2697) |
| `/home/nolan/worktrees/design-lane-render` | `design/lane-render-wire` @ 832b0148 | NO (stranded) | 1 | 2026-09-26 20:04 MDT | Wires lane-4/6/7 vocabularies into renderer |
| `/home/nolan/worktrees/design-lane-08` | `design/lane-08-public-projection` @ 6ab560c3 | NO (stranded) | 1 | 2026-09-26 19:23 MDT | `projectForViewer` public/debug projection split (NOT in HEAD) |
| design-lane-04/05/06/07 | various | NO (stranded) | 0-2 | 2026-09-26 19:06-19:21 MDT | Composition compiler, media intelligence, typography, motion primitives |
| design-sprint-visual-v1 | merged polish-f1 | NO (stranded) | 0 | 2026-09-27 09:16 MDT | Visual sprint merge |
| `/home/nolan/projects/ping-constitutional` | `constitutional-convergence-v2` @ a69bb68f | NO (stranded) | 12 | 2026-09-23 | Constitutional convergence v2 |
| `/home/nolan/projects/ping-lane-l-broker` | `lane/l-secret-broker` @ e48ef710 | YES (ancestor) | 2 | 2026-09-23 | Secret broker, merged |
| `/home/nolan/worktrees/authority-ux` | `copilot/authority-ux` @ 87671a5f | YES (ancestor) | 2 | 2026-09-25 | Merged |
| `/home/nolan/projects/ping-fyd-deploy` | `fyd-deploy` @ ade4ee50 | UNKNOWN | 0 | older | Deploy head |
| `/home/nolan/worktrees/fyd-dehpp-wt`, `/home/nolan/build-*`, `/home/nolan/cohort2-pristine`, etc. | various detached | UNKNOWN | varies | 2026-09-23/24 | Build/proof cohorts, predate the program |

### 1d. Workspace ops repo (`~/workspace`, also the Pig's `/home/nolan/workspace`)

One git repo containing BOTH ops tooling and product work surfaces. HEAD here
is `310ce50`; the Pig's copy is at `9652896` with heavy dirty state (lane 9
reported 1719 dirty lines: EXPLAINED, not anomalous. Both
`orca-adapter/` and `fyd-journal-gateway/` are plain subdirectories of this
repo, so any per-directory "branch/HEAD" probe returns the repo's).

Product-relevant branches and worktrees in the ops repo:

| Branch / worktree | Content | Status |
|---|---|---|
| `p0/front-door-idempotency` | Idempotent MC dispatch front door (lookup-before-mint), lane-d adapter-call shim | Recent P0 work |
| `mc/frontdoor-hardening` | MissionIntent front door: validate -> authorize -> dispatch -> observe; honest executor outcomes; revocation | Recent |
| `mc/fyd-shapeA-site-console` | Tenant-scoped MC dispatch console (`sites/[slug]/mission-control`) | Recent |
| `mc/mission-budgets` | Budget as capability constraint; falsifier FAIL repairs | Worktree `/home/hatch/worktrees/mc-budget-repair` |
| `mc/pass-migration-proof` | Pass migration proof | Worktree `/home/hatch/worktrees/mc-pass-migration-proof` |
| `mc/tenant-hostile-tests` | Hostile tenant tests | Worktree `~/workspace/.worktrees/tenant-hostile` |
| `lane-c/orca-adapter-2026-09-26` | ORCA headless-agent adapter (additive); tenant_id threading into evidence | Recent |
| `jev/shadow-recorder` | Shadow decision recorder | Recent |
| `mc/lane-c-reconcile-gate`, `mc/approval-request`, `mc/audit-payload-lifecycle`, `mc/consequence-policy-input`, `mc/tenant-hardening`, `mc/mission-intent-frontdoor`, `mc/pass-migration-supersession`, `mc/sprint-integration-2026-09-27` | MC capability slices | Various recent |
| `substrate/gap1-F1-lane-e-floats`, `gap2-provenance-ref`, `gap4-binding-lint`, `gap5-probe-health`, `gap1-F6-lane-e-keyorder`, `gap1-canonical-conformance`, `gap3-journal-identity` | Canonical-conformance gap closures | Worktrees under `~/workspace/.worktrees/` and `/home/hatch/worktrees/` |
| `track-a/d1-monitors`, `d2-schedule`, `d3-igprefilter`, `d4-spool` | Track A slices | Worktrees with `work/` + `replay/` pairs |
| `lane-p01/tree` | **Tree extract (mirror) of the product `src/`** at canonical HEAD; working copy currently matches HEAD versions of mc-dispatch.ts, dispatch/route.ts, context-builder.ts, types.ts, visitor-answer.ts, tracer.ts (refresh artifact, not an alternative implementation) | Dirty vs ops HEAD, mtime 2026-09-28 05:59 MDT |
| `security/secret-redaction-2026-09-28` | Current ops HEAD: secret-class redaction for worker prompt construction | Active |
| `spine/x-pass-reached-path`, `stream-b/*`, `audit/beyond-backlog-2026-09-19`, `burn/*`, `feat/orca-unknown-outcome-port`, `fyd/builder-rebuild-v1`, `fyd/builder-rebuild-v1-cherrypick` | Reached-path, visibility, audit, burn, builder | Various |

### 1e. Other repos with PING implementation

| Repo | HEAD / branch | Content |
|---|---|---|
| `~/workspace/orca-adapter` (mirror of Pig's; NOT a git repo, subdir of ops repo) | n/a | ORCA adapter: `adapter.js` (dispatchExecution, reconcileGate, idempotencyKeyFor, verifyResultEnvelope), `vendor/external_agent_adapter.js` (AGENT_PROFILES, `authorizeWorkOrder` at :185), `canonicalization/`, `evidence/`, `test/` (reconcile-gate, tenant-threading, falsify-index-race, secret-redaction selftests) |
| `~/workspace/fyd-build` | `841825c`, branch `fyd-025-semantic-determinism` | FYD-025 semantic determinism, FYD-026/026b claim classification at the overlay/claim boundary |
| `~/workspace/fyd-factory/hpp-clone` | `4d3e3c5` | Exact copy of golden HPP render path at e48ef71 (fidelity PROCEED) |
| `~/workspace/demo-sites`, `~/workspace/fyd-replay`, `~/workspace/fyd-replay-2026-09-27-r2`, `~/workspace/hermes-agent-research`, `~/workspace/ping-ui-contract` | various | Demo sites, replay harnesses, research, UI contract |
| `~/workspace/ping-24h/repro/` | n/a | Lane repros (B3 9a555021, B9 approval/digest) |
| `~/workspace/ping-24h/donors/` | n/a | Donor corpus for the program |

Nine unpushed constitutional-runtime commits (trunk @ 74fbb74): object
`74fbb74` does NOT exist in the canonical Pig repo. Location UNKNOWN (lane 9
also could not locate). Carried as UNKNOWN, not as absent.

## 2. CAPABILITY LEDGER

Each entry: CAPABILITY, CANONICAL CURRENT IMPLEMENTATION, WORKTREE
ALTERNATIVES, DIRTY ALTERNATIVES, ACTIVE WRITER, STRONGEST VERSION, TEST
EVIDENCE, RUNTIME EVIDENCE, WHAT IS UNIQUE, WHAT IS DUPLICATED, WHAT SHOULD
WIN, WHAT SHOULD BE HARVESTED, WHAT EVENTUALLY DIES.

### C1. Ask FYD (visitor answer pipeline)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/ask/` at 0264d517:
  `visitor-answer.ts`, `context-compiler.ts`, `context-projection.ts`,
  `visitor-safe-fields.ts`, `context-builder.ts`, `concierge.ts`,
  `envelope.ts`, `contract.ts` (Nolan 2026-09-25 binding contract),
  `capabilities.ts`, `answer.ts`, `site-spec.ts`, `site-patch.ts`,
  `field-conflicts.ts`, `circle-actions.ts`, `fyd-circle.tsx`; API
  `src/app/api/fyd/ask/` incl. `ask-pipeline.ts`.
- WORKTREE ALTERNATIVES: `/home/nolan/projects/ping-ask-loop`
  (ancestor branch `ask-loop/fyd-ask-behavior`, merged) has 12 UNCOMMITTED
  edits: `visitor-answer.ts` (+21), `src/lib/ping/ask-composer.ts` (+150/-17),
  plus test edits and untracked `ask-loop-gaps.test.ts`. These edits postdate
  the merge and never landed. `/home/nolan/worktrees/lane-e-ask`
  (detached @ e474c89b, 2026-09-24, 12 dirty) is superseded.
- DIRTY ALTERNATIVES (B13): canonical dirty batch rewrites
  `visitor-answer.ts` (159+/16-) and `context-compiler.ts` (1+/4-, import swap
  to shared digest module). Themes: tenant-smuggling fixes, verified public
  projection gating, digest-law pinning.
- ACTIVE WRITER: none observed. Canonical dirty batch last wrote 2026-09-27
  22:58 MDT; ask-loop dirty edits 2026-09-26 18:50 MDT; patch lane active
  2026-09-28 (C2 only).
- STRONGEST VERSION: canonical HEAD + dirty batch (newest hardening:
  tenant-smuggling fixes, verified projection gating). The ask-loop dirty
  `ask-composer.ts` (+150) is the only unmerged functional delta and needs
  review before harvest.
- TEST EVIDENCE: at HEAD: `ask-fyd.test.ts`, `ask-contract.test.ts`,
  `concierge.test.ts`, `context-compiler.test.ts`,
  `context-projection-canary.test.ts`, `services-evidence.test.ts`,
  `ask-privacy-probe.test.ts`, `demo-classification.test.ts`,
  `graph-read-route.test.ts`, `lane-e-battery.test.ts`, `lane-e-oneclick.test.ts`.
  Canonical suite 2026-09-27: 207 suites, 196 pass / 11 fail; 2230 pass / 22
  fail (known-failing list documented; lane 9). Current post-dirty state
  UNKNOWN.
- RUNTIME EVIDENCE: :3100 serves a `.next` build from 2026-09-27 21:00:32,
  which PREDATES the dirty batch (22:55). The served Ask FYD is the
  pre-hardening build. No live probe of the dirty ask path was performed by
  this lane.
- WHAT IS UNIQUE: the dirty batch's tenant-smuggling fixes and verified
  public projection gating exist nowhere else; the ask-loop worktree's
  `ask-composer.ts` +150 delta exists nowhere else.
- WHAT IS DUPLICATED: the ask-loop worktree duplicates the whole ask
  directory at an ancestor state; its dirty edits may partially duplicate the
  dirty batch's `visitor-answer.ts` changes (unverified, needs a diff).
- WHAT SHOULD WIN: canonical HEAD + dirty batch (once ownership is
  established), plus the patch-branch ContextPack wiring (C2) when sequenced.
- WHAT SHOULD BE HARVESTED: diff the ask-loop worktree's dirty
  `ask-composer.ts`/`visitor-answer.ts` against canonical+dirty; keep any
  non-overlapping ask-loop gap coverage (`ask-loop-gaps.test.ts`).
- WHAT EVENTUALLY DIES: the `/home/nolan/projects/ping-ask-loop` worktree
  checkout (after its dirty delta is triaged); `/home/nolan/worktrees/lane-e-ask`.

### C2. Ask context compilation + ContextPack wiring (EVIDENCE to ORCA CONTEXT edge)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/ask/context-compiler.ts` at
  0264d517 (sha256 digest of canonical context bytes; test
  `context-compiler.test.ts`). The MC dispatch context mint is params-only:
  `contextPackId = 'mc-ctx-' + missionId`, zero evidence ids (lane 14).
  `compileAskContext` is NOT wired into dispatch at HEAD or in the dirty tree.
- WORKTREE ALTERNATIVES: patch branch `decision-fabric/contextpack-wire-2026-09-28`
  @ 9a555021: `src/app/api/mc/_lib/mc-context-pack.ts` (`compileAskContext()`,
  83 lines) + 214-line test + 36-line wiring into
  `src/app/api/mc/dispatch/route.ts`. Separately, stranded tenanos branch
  `P-20260923-098` @ 13f21b59: `src/tenanos/memory/context-pack.ts` (172
  lines) + `context-pack.test.ts` (149 lines): a memory retrieval to worker
  context-pack assembler (RETRIEVAL -> CONTEXT PACK -> WORKER), pure function,
  tenant-boundary re-enforced, rank_score dies at the boundary.
- DIRTY ALTERNATIVES (B13): dirty `context-compiler.ts` swaps local
  `sha256Hex` for the new untracked `src/lib/ping/digest.ts`. No behavioral
  change for string inputs. The dirty tree does NOT wire `compileAskContext`;
  the params-only mint is intact inside dirty hunks (now behind a
  caller-identity gate and idempotency lookup, with tenant-aware
  `publishArtifact`).
- ACTIVE WRITER: patch lane (committed 2026-09-28 14:35 MDT; call site
  `src/app/api/mc/dispatch/route.ts` owner-locked for that lane).
- STRONGEST VERSION: the patch branch for the dispatch edge (it is the only
  implementation that closes EVIDENCE to ORCA CONTEXT on the canonical
  product path). The tenanos assembler is the strongest for the
  memory-to-worker edge but lives on a stranded 2026-09-23 branch.
- TEST EVIDENCE: `mc-context-pack.test.ts` (214 lines, patch branch);
  `context-pack.test.ts` (149 lines, P-098); `context-compiler.test.ts`
  (HEAD).
- RUNTIME EVIDENCE: none. The patch is unwired (isolated branch, merge
  sequenced behind gateway proof + reached-loop re-run per owner decision
  2026-09-28 ~15:04 MDT). The P-098 assembler has no production caller.
- WHAT IS UNIQUE: `compileAskContext()` and its dispatch wiring (patch);
  the tenanos assembler's rank-killing + tenant-boundary contract (P-098).
- WHAT IS DUPLICATED: the NAME "context pack" only. The two implementations
  are different semantic units (dispatch evidence pack vs memory worker
  pack). Treat the naming collision as a defect to fix at merge time, not as
  duplication of implementation.
- WHAT SHOULD WIN: patch branch for the MC dispatch edge (owner-sequenced);
  tenanos assembler as the reference design for any future memory-to-worker
  pack, renamed to avoid the collision.
- WHAT SHOULD BE HARVESTED: from P-098, the I3/I5 contract (rank_score dies,
  tenant boundary re-enforced, `pack:<sha256-16>` id format) into the
  patch's `mc-context-pack.ts` if the dispatch pack ever carries retrieved
  memory.
- WHAT EVENTUALLY DIES: the params-only `mc-ctx-` mint (replaced by the
  patch); the P-098 branch ref (after its contract is harvested).

### C3. Evidence compilation and binding (why-this, binding verifier, render projection)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/object/why-this-steps.ts` +
  `__tests__/why-this-steps.test.ts`, `src/app/api/fyd/why-this/route.ts`,
  `src/fyd/ui/why-this.tsx` at 0264d517. B13: dirty batch touches
  why-this-steps (33+/22-).
- WORKTREE ALTERNATIVES: stranded `design/fix-evidence-ref-current` @
  4c947384 (+6820/-2697, 86 files): `src/fyd/sitespec/binding-verifier.ts` +
  test, `src/fyd/sitespec/render-projection.ts` (266 lines),
  `render-viewer-server.ts`, theme system (`src/fyd/theme/`), why-this.tsx
  (+9). This is the largest evidence-presentation alternative in the forest.
- DIRTY ALTERNATIVES (B13): why-this-steps 33+/22- in the dirty batch.
- ACTIVE WRITER: none observed since 2026-09-26 20:13 MDT (fix-evidence-ref
  HEAD) and 2026-09-27 22:55 MDT (dirty batch).
- STRONGEST VERSION: fix-evidence-ref branch for evidence-ref stamping and
  render projection; canonical+dirty for why-this steps. Neither subsumes
  the other.
- TEST EVIDENCE: `binding-verifier.test.ts` (branch),
  `why-this-steps.test.ts` (HEAD), `__tests__/why-this-steps.ts` (workspace
  ops root), `whythis-renderer.patch` (ops root).
- RUNTIME EVIDENCE: falsification evidence 2026-09-26 (ops commit 85faad1):
  the live renderer has ZERO binding-verifier call sites; the ask field-gate
  is absent. The verifier exists but is unwired. Runtime state of the dirty
  why-this steps: UNKNOWN (served build predates the dirty batch).
- WHAT IS UNIQUE: evidence-ref stamping for overlay-touched objects and the
  render-projection module (branch only); why-this step chains (canonical).
- WHAT IS DUPLICATED: `why-this-steps.ts` exists both in the canonical tree
  and at the ops repo root (`~/workspace/why-this-steps.ts` + test); the
  ops-root copy's provenance is UNKNOWN (harvest candidate or stale dup).
- WHAT SHOULD WIN: canonical why-this steps + dirty hardening for the answer
  path; fix-evidence-ref's binding-verifier + render-projection for the
  render path, once the zero-call-site gap is closed by an explicit wiring
  WorkOrder.
- WHAT SHOULD BE HARVESTED: the branch's `binding-verifier.ts`,
  `render-projection.ts`, and evidence-ref stamping semantics.
- WHAT EVENTUALLY DIES: the ops-root `why-this-steps.ts` dup (after
  provenance is established); whichever projection module loses the
  render-path decision.

### C4. Owner correction (one correction propagates through the system)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/customize/` at 0264d517:
  `server.ts`, `apply-layer.ts`, `owner-command-compiler.ts`,
  `owner-proposal.ts`, `propose.ts`, `write-boundary.ts`, `intent.ts`,
  `types.ts`, README, tests incl. `conversational-customization-e2e.test.ts`.
- WORKTREE ALTERNATIVES: none active. `workerE/intent-move-first` merged.
  Design lanes touch presentation only.
- DIRTY ALTERNATIVES (B13): the dirty batch's largest single-file change is
  `customize/server.ts` (421+/7-) plus `owner-overlay.ts` (180+/4-) and a
  261-line `owner-overlay.test.ts`. This is the owned-work extension of the
  correction path (digest-law pinning, mount contract).
- ACTIVE WRITER: none observed since the 2026-09-27 22:55 batch. Owner
  decision: ASSUME LIVE OWNED WORK.
- STRONGEST VERSION: canonical HEAD + dirty batch (the dirty batch is the
  newest correction-path work in the forest).
- TEST EVIDENCE: `owner-overlay.test.ts` (261+/1-, dirty),
  `conversational-customization-e2e.test.ts` (HEAD), customize `__tests__/`
  (HEAD). Post-dirty suite state UNKNOWN.
- RUNTIME EVIDENCE: the product-frontier acceptance is "prove ONE correction
  propagates through the system." No runtime proof observed by this lane;
  :3100 serves the pre-dirty build. Correction propagation is CLAIMED by
  tests, not proven live.
- WHAT IS UNIQUE: the dirty `customize/server.ts` rewrite and
  `owner-overlay.ts` (only in the dirty tree + B13's preserved patch).
- WHAT IS DUPLICATED: none found. Owner correction has exactly one
  implementation lineage.
- WHAT SHOULD WIN: canonical + dirty batch (pending ownership
  establishment). No alternative to converge.
- WHAT SHOULD BE HARVESTED: nothing external; the work is already in the
  canonical lineage, awaiting preservation/merge decisions.
- WHAT EVENTUALLY DIES: nothing. This unit needs a writer, not a retirement.

### C5. Conversational customization (classify request; never turn presentation into canonical mutation)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/customize/intent.ts` at
  0264d517 (from merged `workerE/intent-move-first`): typed intent parsing,
  Plain English to ParsedIntent, deterministic keyword-anchored regexes, no
  LLM. Supported: promote_first, feature_object, hide_section, hide_object,
  show_section; anything else is UnsupportedIntent, never silently
  reinterpreted. Targets bind against site evidence; unresolvable targets
  yield UnresolvedIntent with the reason spelled out. Plus `propose.ts`,
  `owner-proposal.ts`, `write-boundary.ts`, and the e2e test.
- WORKTREE ALTERNATIVES: the `workerE/intent-move-first` worktree
  (`/home/nolan/build-workerE-intent`) is a stale ancestor (merged).
- DIRTY ALTERNATIVES (B13): dirty `customize/route.ts` (57+/3-) under
  `src/app/api/fyd/` (ask + customize + edge + overrides + why-this slice,
  7 files).
- ACTIVE WRITER: none observed.
- STRONGEST VERSION: canonical HEAD + dirty route hardening.
- TEST EVIDENCE: `conversational-customization-e2e.test.ts` (HEAD).
- RUNTIME EVIDENCE: none observed; served build predates the dirty batch.
- WHAT IS UNIQUE: the deterministic intent parser with UnsupportedIntent
  honesty (no other parser in the forest).
- WHAT IS DUPLICATED: none found.
- WHAT SHOULD WIN: canonical lineage. The open product work is the
  classification discipline (truth correction vs owner intent vs presentation
  preference vs content visibility vs media association vs consequential
  action), which is policy, not a second implementation.
- WHAT SHOULD BE HARVESTED: nothing; single lineage.
- WHAT EVENTUALLY DIES: nothing.

### C6. Regeneration (rebuild the site from spec, preserving owner intent)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/builder/semantic-diff.ts` +
  `__tests__/semantic-diff.test.ts` and `__tests__/source-refresh.test.ts`
  at 0264d517 (builder-level diff and source-refresh). `src/fyd/refresh/`
  and `src/fyd/proceduralize/` support the pipeline.
- WORKTREE ALTERNATIVES: stranded `fyd/builder-rebuild-v1` @ 4eb90401
  (`/home/nolan/worktrees/fyd-family-converge`, 2026-09-25): builder rebuild
  v1 with a coppersmith-family proof (`fyd-product-lane/proof/
  coppersmith-family-2026-09-25/`). Ops repo also has
  `fyd/builder-rebuild-v1` and `fyd/builder-rebuild-v1-cherrypick` branches.
  `~/workspace/fyd-build` repo (branch `fyd-025-semantic-determinism`):
  FYD-025 semantic determinism as canonical regression, FYD-026/026b claim
  classification at the overlay/claim boundary.
- DIRTY ALTERNATIVES: none identified in the dirty batch for regeneration.
- ACTIVE WRITER: none observed since 2026-09-25 (builder-rebuild-v1 HEAD).
- STRONGEST VERSION: UNKNOWN. The canonical builder's semantic-diff and the
  rebuild-v1 branch were not compared test-for-test by this lane; the
  coppersmith-family proof is the only regeneration proof artifact found.
- TEST EVIDENCE: `semantic-diff.test.ts`, `source-refresh.test.ts` (HEAD);
  coppersmith-family proof files (branch); fyd-build repo jest suites.
- RUNTIME EVIDENCE: none.
- WHAT IS UNIQUE: semantic-diff at HEAD; the family proof and rebuild-v1
  structure on the stranded branch; claim classification at the
  overlay/claim boundary in fyd-build.
- WHAT IS DUPLICATED: builder concepts across canonical `src/fyd/builder/`,
  the rebuild-v1 branch, `~/workspace/fyd-build`, and ops `fyd-builder/`,
  `fyd-product-lane/`, `phase20-builder-staging/`. The duplication is
  structural (multiple builder homes), not yet proven to be functional
  duplication.
- WHAT SHOULD WIN: to be determined by a builder convergence WorkOrder that
  diffs `semantic-diff.ts` against rebuild-v1 and runs both test suites.
  Do NOT write a new builder before that comparison.
- WHAT SHOULD BE HARVESTED: the coppersmith-family proof as the
  regeneration acceptance fixture; fyd-build's claim classification if the
  canonical builder lacks it.
- WHAT EVENTUALLY DIES: the losing builder home(s) after the comparison;
  likely the stranded branch if canonical semantic-diff covers it.

### C7. Generated experience and presence (data-derived visual identity)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/presence/` at 0264d517
  (from merged `fyd/lane-p01-presence-compiler`): `derive-presence.ts`
  (H3 lane: per-site visual identity as a pure function of object graph +
  media manifest; hero treatment, logo, gallery strip, accent color and
  button radius from a stable hash of the owner object's graph identity),
  `presence-band.tsx`, `src/app/api/fyd/presence/`,
  `src/app/build/presence-box.tsx`.
- WORKTREE ALTERNATIVES (all stranded, unmerged, 2026-09-26): design lane
  04 (graph-measured composition compiler), lane 05 (media intelligence v1:
  richness scoring, focal backfill, gallery dimension gate, alt text),
  lane 06 (typography), lane 07 (motion primitives: reveal, before-after,
  count-up), lane 08 (`projectForViewer`: public vs debug projection split,
  NOT in HEAD), `design/lane-render-wire` (wires lane-4/6/7 vocabularies
  into the renderer), `design/sprint-visual-v1` (polish-f1 merge).
- DIRTY ALTERNATIVES (B13): dirty `src/app` sites/build/dev/layout and
  `o/[objectId]/page.tsx` (5+/359-, large deletion); site-client and
  site-metadata changes.
- ACTIVE WRITER: none observed since 2026-09-26 20:13 MDT.
- STRONGEST VERSION: canonical presence compiler for identity; design lanes
  for composition/media/motion vocabulary. They are complementary layers,
  not competitors, except lane-08's `projectForViewer`, which answers the
  public-projection question HEAD answers differently (HEAD has no
  `projectForViewer`).
- TEST EVIDENCE: presence tests at HEAD (unverified count by this lane);
  design-lane branches carry their own tests (unverified).
- RUNTIME EVIDENCE: none; the design lanes never reached the served build.
- WHAT IS UNIQUE: data-derived presence selection (canonical); the
  composition compiler, media intelligence, motion primitives, and the
  public/debug projection split (design lanes only).
- WHAT IS DUPLICATED: unknown overlap between the dirty `o/[objectId]`
  rewrite and the design lanes' render wiring. Needs a diff before any
  render-path WorkOrder.
- WHAT SHOULD WIN: canonical presence compiler stays. The design-lane
  vocabularies should be evaluated as additive layers on top of it, not as
  replacements. `projectForViewer` needs an explicit adopt/reject decision
  because it changes the public projection contract.
- WHAT SHOULD BE HARVESTED: lane-04 composition compiler, lane-05 media
  intelligence, lane-07 motion primitives (all additive, no canonical
  counterpart).
- WHAT EVENTUALLY DIES: the design-lane worktree checkouts after harvest
  decisions; any lane whose vocabulary is absorbed.

### C8. Decision fabric (bounded decisions with evidence, shadow evaluation)

- CANONICAL CURRENT IMPLEMENTATION: the decision surface inventory lives in
  the program, not the tree: lane 11's `PING_DECISION_SURFACE.md` (16
  deterministic surfaces, 10 bounded candidates, 4 deep-reasoning, 5 human
  authority, 7 unknown). Live deterministic unit: `mc.authorize_work_order/v1`
  = `authorizeWorkOrder()` at
  `orca-adapter/vendor/external_agent_adapter.js:185` (8 ordered fail-closed
  checks; owner PING; GRANT|DENY). Callers: `adapter.js` dispatchExecution
  (:1239 pre-dispatch gate; :1298 issueWorkOrder re-runs it). Shadow
  contract defined; 6 real Jev shadow samples, 6/6 agreement at 0.5, Brier
  0.0076, latency 334-566ms; Jev stays SHADOW (n=6, calibration NOT
  established). B2 tournament: 7 contracts, 80 replay cases; key finding
  that shadow outputs are framing-sensitive (AW-01 0.36 vs lane-11 S1 0.95
  on identical semantics).
- WORKTREE ALTERNATIVES: stranded tenanos `P-20260923-091-decision-budget`
  (decision-budget taxonomy + auto-resolvers). Ops branch
  `jev/shadow-recorder` (shadow decision recorder). The patch branch is the
  decision-fabric branch in flight (C2).
- DIRTY ALTERNATIVES: none (the dirty batch does not touch the decision
  surface).
- ACTIVE WRITER: the parent-run decision-fabric lane (lane 11, shadow-Jev;
  consumed on landing). The gateway jev-namespace fix is parent-owned
  (single writer, authorized 2026-09-28 ~15:04 MDT).
- STRONGEST VERSION: `authorizeWorkOrder` as specified (deterministic,
  fail-closed, evidence = AGENT_PROFILES facts + request fields).
- TEST EVIDENCE: GAP. Lane 11 confirmed read-only: no test file in
  orca-adapter references `authorizeWorkOrder`. Neighboring gates have
  `reconcile-gate-selftest.js` and `tenant-threading-selftest.js`. Shadow
  samples: 6 (lane 11) + 87 bounded Jev calls (B2 tournament).
- RUNTIME EVIDENCE: live in the loop proof per the seam report; the gateway
  NAMESPACE_OWNERS missing-jev defect (3 scheduler missions in fail/retry)
  is the live defect, fix authorized narrowly.
- WHAT IS UNIQUE: the 8-check fail-closed authorization shape; the shadow
  evaluation protocol with provenance sidecars.
- WHAT IS DUPLICATED: decision-budget taxonomy (P-091) vs the lane-11
  decision surface inventory (unverified overlap; both classify bounded
  decisions).
- WHAT SHOULD WIN: lane-11's live-grounded inventory as the authority;
  P-091 harvested only for auto-resolver mechanics if the inventory lacks
  them.
- WHAT SHOULD BE HARVESTED: P-091's auto-resolver patterns; B2's
  framing-sensitivity finding as a standing shadow-protocol rule (pin
  question wording per contract).
- WHAT EVENTUALLY DIES: any second decision registry; the P-091 branch ref
  after harvest.

### C9. Worker contract (WorkOrder issuance, reconcile gate, result verification)

- CANONICAL CURRENT IMPLEMENTATION: split across two homes. (1) ORCA
  adapter (`~/workspace/orca-adapter`, Pig `/home/nolan/workspace/orca-adapter`,
  not a git repo): `adapter.js` `dispatchExecution` (14-field WorkOrder,
  deterministic `work_order_id`, oneshot transport, no cancellation, no live
  health probe, registry-state health only), `reconcileGate`
  (idempotency key + prior-outcome lookup; reconciliation record required
  before a new attempt on uncertain prior; `attemptIsUncertain`,
  `validateReconciliation`), `verifyResultEnvelope` (exact echoes of
  work_order_id/context_pack_id/capability; three-way agent binding;
  `verifiedAt <= deadline`; invalid results are non-retryable and can never
  reach canonical event authority; `recordVerifiedResult` emits
  WORKER_COMPLETED/FAILED with `effect_state` defaulting to
  `effect_unknown`). (2) Product tree `src/app/api/mc/_lib/mc-dispatch.ts` +
  `src/app/api/mc/dispatch/route.ts` (canonical dispatch entry).
- WORKTREE ALTERNATIVES: ops branches `p0/front-door-idempotency`
  (lookup-before-mint, lane-d adapter-call shim),
  `mc/frontdoor-hardening` (validate -> authorize -> dispatch -> observe;
  honest executor outcomes; revocation), `mc/lane-c-reconcile-gate`,
  `lane-c/orca-adapter-2026-09-26` (additive headless-agent adapter;
  `tenant_id` threaded into evidence), `mc/mission-budgets` (budget as
  capability constraint), `mc/pass-migration-proof`. Stranded tenanos
  `P-20260923-103-attempt-fencing` (attempt fencing mechanics) and
  `tenanos-wave/integration` (P-101 run reconciler). Lane 14's verdicts:
  executor selection is caller-decided (adapter validates only);
  cancellation ABSENT; health ABSENT (live probe); handles N/A by design;
  result verification strong and explicit.
- DIRTY ALTERNATIVES (B13): dirty `dispatch/route.ts` (121+/19-) and
  `_lib/mc-dispatch.ts` (58+/2-): trusted caller identity
  (`x-mc-caller-key` registry via new untracked `mc-dispatch-identity.ts`,
  Mission J), deterministic idempotency keys, lookup-before-mint with 409
  HOLD, tenant-scoped artifact publishing. The 409 HOLD / idempotency
  machinery that lanes 12/B4 analyzed lives ONLY in the dirty worktree, not
  at HEAD and not on the patch branch.
- ACTIVE WRITER: patch lane owns `dispatch/route.ts` call site (locked).
  The dirty batch's dispatch work has no active writer (2026-09-27 22:55).
  The jev-namespace gateway fix is parent-owned and does not touch the
  worker contract.
- STRONGEST VERSION: the dirty tree's dispatch slice (newest: caller
  identity + idempotency + tenant publishing) layered on the orca-adapter's
  reconcile gate and result verification. No single tree has all three.
- TEST EVIDENCE: `reconcile-gate-selftest.js`,
  `tenant-threading-selftest.js`, `falsify-index-race.js`,
  `secret-redaction-selftest.js` (orca-adapter/test). No dedicated test for
  `authorizeWorkOrder` (lane 11 gap).
- RUNTIME EVIDENCE: adapter live in the loop proof (lane 11). The dirty
  dispatch slice is NOT served (:3100 predates it; journal gateway serves
  the dirty `server.mjs` but that is the journal, not dispatch).
- WHAT IS UNIQUE: three-way agent binding + `effect_unknown` default
  (orca-adapter); caller-identity gate + 409 HOLD (dirty tree only);
  budget-as-capability-constraint (`mc/mission-budgets`).
- WHAT IS DUPLICATED: idempotency front-door logic in THREE places: the
  dirty tree's dispatch slice, ops `p0/front-door-idempotency`, and
  `mc/frontdoor-hardening`. Lookup-before-mint exists in both the dirty
  tree and the ops branch. This is the forest's clearest active
  duplication on the worker path.
- WHAT SHOULD WIN: one idempotent front door. The dirty tree's version is
  newest and tenant-aware; the ops branches must be diffed against it and
  then retired. The orca-adapter's reconcile gate stays as the attempt
  layer (different semantic level: front door vs attempt).
- WHAT SHOULD BE HARVESTED: revocation mechanics (`mc/frontdoor-hardening`
  H7); budget-as-capability-constraint (`mc/mission-budgets`); attempt
  fencing (P-103); run reconciler (P-101) for the missing dedicated
  reconciler lane 9 noted as ABSENT.
- WHAT EVENTUALLY DIES: two of the three idempotency front doors; the
  P-103/P-101 branch refs after harvest.

### C10. Mission Control projection (observe the system truthfully)

- CANONICAL CURRENT IMPLEMENTATION: at HEAD, `src/app/mission-control/`
  exists (page skeleton) and `src/app/api/mc/` has 5 routes (dispatch,
  missions, missions/[id], technology). The FULL surface B7 audited (7 tabs:
  TODAY, AGENTS, BUSINESSES, WEBSITES, TECHNOLOGY, SEARCH, DISPATCH; 11 API
  routes incl. today, agents, approvals, graph, object, search,
  trace-forward) exists ONLY in the dirty tree: 7 new untracked MC route
  dirs + 2 new lib modules (`mc-dispatch-identity.ts` Mission J,
  `mc-tenant-gate.ts` Mission L) + dirty dispatch slice.
- WORKTREE ALTERNATIVES: ops branch `mc/fyd-shapeA-site-console`
  (tenant-scoped MC dispatch console at `sites/[slug]/mission-control`).
  `/home/nolan/workspace/mission-control/` on the Pig holds only
  `dispatch-identities.json` (required by the dirty caller-identity gate;
  the dirty dispatch fail-closes 401/503 without it).
- DIRTY ALTERNATIVES (B13): the MC surface IS the dirty alternative. B7
  audit verdicts on the dirty worktree code: TODAY "happening now" PARTIAL
  (inprogress dir names hardcoded RUNNING, no liveness check), "will happen
  next" PARTIAL (cron.d filenames rendered PROVEN), per-section DEGRADED
  discarded by the page (MISLEADING PROVEN badges), reverse trace PARTIAL
  (real where `ping-event:` refs resolve).
- ACTIVE WRITER: none observed. ASSUME LIVE OWNED WORK.
- STRONGEST VERSION: the dirty tree (only complete MC surface in the
  forest).
- TEST EVIDENCE: new MC test files in the dirty batch (B13 inventory);
  `mc-approval/` Python approval tooling (untracked).
- RUNTIME EVIDENCE: none; the served build predates the MC routes.
- WHAT IS UNIQUE: the 7-tab observability surface with PROVEN/OBSERVED/
  DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED field badges (dirty
  tree only); the tenant-scoped site console (shapeA branch only).
- WHAT IS DUPLICATED: none found; MC has one lineage (HEAD skeleton ->
  dirty full surface) plus the shapeA console variant.
- WHAT SHOULD WIN: the dirty MC surface (pending ownership). The shapeA
  console should be evaluated as the tenant-scoped embedding of it, not a
  competitor.
- WHAT SHOULD BE HARVESTED: B7's MISLEADING/PARTIAL verdicts are a punch
  list, not harvest: fix the RUNNING hardcode, the cron.d PROVEN claim,
  and the discarded DEGRADED status before the surface is trusted.
- WHAT EVENTUALLY DIES: nothing yet; the surface needs completion, not
  retirement.

### C11. MC dispatch API (the mission entry point)

Covered under C9 for contract semantics. Tree-level summary: HEAD has the
params-only mint; the dirty tree extends it (identity, idempotency, tenant);
the patch branch replaces the mint's context source (`compileAskContext`).
All three touch `src/app/api/mc/dispatch/route.ts`. The patch lane owns the
call site (owner-locked). Any dispatch WorkOrder must 3-way merge, not
reimplement.

### C12. Journal gateway (FYD demo journal)

- CANONICAL CURRENT IMPLEMENTATION: `tools/fyd-journal-gateway/server.mjs`
  (328 lines at 0264d517): standalone demo journal at
  `FYD_JOURNAL_GATEWAY_URL` (default 127.0.0.1:18199); `GET
  /events/FYD_SITE_OVERLAY?tenant=` with server-side tenant scoping;
  expected by `PingObjectReader.queryFydSiteOverlays` (the :3100 FYD site
  server). Contract mirrors the main gateway's `GET /events/:stream` and the
  ask-lane test stub.
- WORKTREE ALTERNATIVES: ancestor `workerF/edge-restore` stripped 145 lines
  from it (merged, so HEAD already reflects that history). Ops repo has
  `fyd-journal-gateway/` working area.
- DIRTY ALTERNATIVES (B13): dirty `server.mjs` (31+/1-). The journal gateway
  SERVES the dirty `server.mjs` (lane 9); `events.jsonl` last write
  2026-09-27 20:44 MDT (quiet ~18h at T+0).
- ACTIVE WRITER: none observed.
- STRONGEST VERSION: the dirty `server.mjs` (it is literally what runs).
- TEST EVIDENCE: ask-lane stub journal (`src/app/api/fyd/ask/__tests__/
  stub-journal.ts`); `wb-f-journal-privacy.test.ts` (ops root).
- RUNTIME EVIDENCE: serving dirty code now; event stream quiet ~18h.
- WHAT IS UNIQUE: the tenant-scoped overlay event stream (only journal in
  the forest serving FYD overlays).
- WHAT IS DUPLICATED: none found.
- WHAT SHOULD WIN: canonical lineage; keep the dirty `server.mjs`.
- WHAT SHOULD BE HARVESTED: nothing external.
- WHAT EVENTUALLY DIES: nothing.

### C13. Tenant isolation (boundary enforcement)

- CANONICAL CURRENT IMPLEMENTATION: `src/fyd/tenant/` at 0264d517
  (`scoped-stores.ts`, `tenant-context.ts`, tests incl. `e-scoped-stores`,
  `f-journal-privacy`, `g-route-isolation`, `h-crash-window`).
- WORKTREE ALTERNATIVES: stranded tenanos `P-20260923-092-tenant-kit`
  (tenant boundary kit); ops worktree `~/workspace/.worktrees/tenant-hostile`
  (`mc/tenant-hostile-tests`); ops branches `mc/tenant-hardening`,
  `trackc/tenant-prep-2026-09-27`; `workerB/tenantos-fyd-seam` and
  `workerH/tenantos-journal-merge` (merged).
- DIRTY ALTERNATIVES (B13): new untracked `mc-tenant-gate.ts` (Mission L,
  Q-P0-06 finding #4), referencing Mission D's synthetic tenants
  (`tenant-a-synth`); dirty dispatch publishes artifacts tenant-scoped.
- ACTIVE WRITER: none observed.
- STRONGEST VERSION: canonical `src/fyd/tenant/` + dirty `mc-tenant-gate.ts`
  (newest, finding-driven).
- TEST EVIDENCE: tenant `__tests__/` (HEAD); hostile tests (ops worktree);
  `wb-test_tenant_postgres_isolation.js`,
  `wb-test_tenant_vector_isolation.js` (ops root).
- RUNTIME EVIDENCE: none observed.
- WHAT IS UNIQUE: the synthetic-tenant test vocabulary (`tenant-a-synth`)
  and the Mission L gate (dirty only).
- WHAT IS DUPLICATED: tenant-kit concepts (P-092) vs canonical
  `src/fyd/tenant/` (unverified overlap; P-092 predates the canonical
  tenant dir's current form).
- WHAT SHOULD WIN: canonical `src/fyd/tenant/` + dirty gate. P-092 diffed
  once, then retired.
- WHAT SHOULD BE HARVESTED: any P-092 boundary-kit mechanics the canonical
  dir lacks.
- WHAT EVENTUALLY DIES: the P-092 branch ref after harvest.

### C14. Digest authority (one digest, canonical bytes)

- CANONICAL CURRENT IMPLEMENTATION: at HEAD, `src/fyd/ask/context-compiler.ts`
  carries a local `sha256Hex`; `dev-signer.canonicalizeJson` is a second
  formulation.
- WORKTREE ALTERNATIVES: none.
- DIRTY ALTERNATIVES (B13): new untracked `src/lib/ping/digest.ts` (+ test),
  header citing NORTH STAR BACKLOG_PING.md rule 16 and addressing "every
  lane"; dirty compiler imports from it. B9's repro 3 proved the "one digest
  authority" claim FALSE today: `digest.ts` pins undefined-valued keys as
  `"key":null` (emitted) while `dev-signer.canonicalizeJson` drops them
  (digests `29ee1b6b...` vs `4e507a15...` for the same record). Three
  formulations coexist.
- ACTIVE WRITER: none observed since 2026-09-27 21:34 MDT.
- STRONGEST VERSION: `digest.ts` is the CLAIMED authority but not yet the
  actual one.
- TEST EVIDENCE: `digest.test.ts` (untracked, dirty batch).
- RUNTIME EVIDENCE: the divergence is proven by B9's repro, not by runtime.
- WHAT IS UNIQUE: the pinned digest-law header and the null-vs-dropped
  pinning decision (dirty only).
- WHAT IS DUPLICATED: the digest formulation itself (three variants).
- WHAT SHOULD WIN: exactly one. The WorkOrder that converges this must pick
  the undefined-key pinning explicitly (it changes digest-keyed identity
  across both formulations) and then delete the losers.
- WHAT SHOULD BE HARVESTED: the `digest.ts` test as the conformance suite
  for whichever formulation wins.
- WHAT EVENTUALLY DIES: two of the three formulations.

### C15. Secret broker (credential handling for workers)

- CANONICAL CURRENT IMPLEMENTATION: `src/lib/secrets/` at 0264d517 (from
  merged `lane/l-secret-broker`): `secret-broker.ts` + README.
- WORKTREE ALTERNATIVES: none active.
- DIRTY ALTERNATIVES (B13): new untracked `src/lib/secrets/` content in the
  dirty batch: `secret-broker.ts` + redteam test (21:35 wave). This appears
  to EXTEND the merged broker.
- ACTIVE WRITER: none observed. The 2026-09-28 secret-handling baseline
  (AGENTS.md, owner directive) is the standing policy.
- STRONGEST VERSION: canonical + dirty extension.
- TEST EVIDENCE: redteam test (dirty, untracked); ops
  `secret-redaction-selftest.js` (orca-adapter/test).
- RUNTIME EVIDENCE: none.
- WHAT IS UNIQUE: the redteam test (dirty only).
- WHAT IS DUPLICATED: none found.
- WHAT SHOULD WIN: canonical lineage + dirty extension.
- WHAT SHOULD BE HARVESTED: nothing external.
- WHAT EVENTUALLY DIES: nothing.

### C16. Engagement guard and grill-20 classifier (ops repo, outreach + autonomy)

- CANONICAL CURRENT IMPLEMENTATION: n/a (ops repo, not the product tree).
  `~/workspace/outreach/engagement-guard.py` (never-reengage guard; 2026-09-25
  blind-spot fix: merges terminal-aware ledger post IDs on every load).
  `~/workspace/fyd-autonomy/escalation-log.jsonl` + grill-20 classifier
  (SI-03 escalation gate; B2 found schema drift: object-form failed_checks,
  null checks, extended verdict vocabulary, one malformed JSONL line).
- WORKTREE ALTERNATIVES: none.
- DIRTY ALTERNATIVES: the Pig ops repo has heavy dirty state (lane 9: 1719
  dirty lines at 9652896); this lane did not inventory it (out of scope,
  ops-side).
- ACTIVE WRITER: outreach/engagement passes run on cadence (2h, CEO MODE
  ceilings); the guard is load-bearing for every pass.
- STRONGEST VERSION: current ops HEAD versions.
- TEST EVIDENCE: guard verified post-fix (blocked all 9 must-drops as
  ALREADY_ENGAGED, 2026-09-25).
- RUNTIME EVIDENCE: in daily use by engagement passes.
- WHAT IS UNIQUE: the terminal-aware ledger merge (guard); the 20-check
  escalation record schema (grill-20).
- WHAT IS DUPLICATED: none found.
- WHAT SHOULD WIN: current.
- WHAT SHOULD BE HARVESTED: B2's schema-drift finding should become a
  conformance test for the escalation log writer.
- WHAT EVENTUALLY DIES: nothing.

### C17. Builder homes (structural duplication, functional overlap unverified)

Homes found: canonical `src/fyd/builder/` (+ `src/fyd/refresh/`,
`src/fyd/proceduralize/`); stranded `fyd/builder-rebuild-v1`;
`~/workspace/fyd-build` repo; ops `fyd-builder/`, `fyd-product-lane/`,
`phase20-builder-staging/`, `fyd-object-build/`, `fyd4-stage/`,
`fyd-dogfood/`, `fyd-proof/`, `fyd-promote-work/`. Functional comparison was
NOT performed by this lane (see C6). No WorkOrder may add another builder
home. The convergence WorkOrder must produce the pairwise diff and the
retirement plan.

## 3. BRANCH / WORKTREE OWNERSHIP (ONE SEMANTIC UNIT -> ONE ACTIVE WRITER)

| Semantic unit | Authoritative implementation | Active writer | Contenders (must not write) |
|---|---|---|---|
| Ask FYD answer pipeline | canonical HEAD + dirty batch | NONE (owned, dirty, no writer ~16.5h) | ping-ask-loop worktree (stale ancestor + 12 dirty files: triage-only) |
| Ask context compilation | canonical `context-compiler.ts` + dirty import swap | NONE | P-098 (stranded; harvest-only) |
| MC dispatch context wiring | patch branch 9a555021 | PATCH LANE (call site owner-locked) | dirty tree (3-way merge later, not now) |
| MC dispatch front door (idempotency) | dirty tree slice (newest) | NONE (owned, dirty) | `p0/front-door-idempotency`, `mc/frontdoor-hardening` (diff-then-retire) |
| Worker attempt layer (reconcile gate) | orca-adapter `adapter.js` | NONE | `mc/lane-c-reconcile-gate` (verify overlap, then retire or merge) |
| Decision unit mc.authorize_work_order/v1 | orca-adapter vendor `:185` | NONE (deterministic; parent owns gateway jev-namespace fix only) | shadow recorders (read-only) |
| Mission Control surface | dirty tree (7 tabs, 11 routes) | NONE (owned, dirty) | shapeA console branch (tenant embedding evaluation only) |
| Owner correction | canonical + dirty batch | NONE (owned, dirty) | none |
| Conversational customization intent | canonical `intent.ts` | NONE | none |
| Evidence ref / render projection | CONTESTED: canonical why-this vs fix-evidence-ref branch | NONE | needs adopt/reject decision before any writer |
| Generated experience presence | canonical `src/fyd/presence/` | NONE | design lanes (additive-layer evaluation only) |
| Journal gateway | dirty `server.mjs` (what serves) | NONE | none |
| Tenant isolation | canonical `src/fyd/tenant/` + dirty `mc-tenant-gate.ts` | NONE (owned, dirty) | P-092 (harvest-only) |
| Digest authority | CONTESTED (3 formulations) | NONE | needs explicit pinning decision |
| Secret broker | canonical + dirty extension | NONE (owned, dirty) | none |
| Builder | CONTESTED (multiple homes) | NONE | needs convergence WorkOrder first |
| ContextPack (dispatch) | patch branch | PATCH LANE | none |
| ContextPack (memory) | P-098 (stranded) | NONE | harvest-only, rename on adoption |

## 4. STRANDED WORK REGISTER (unmerged, unclaimed, or ancestor-dirty)

1. `/home/nolan/projects/ping-ask-loop`: 12 dirty files on a MERGED ancestor
   branch. `ask-composer.ts` (+150/-17) and `visitor-answer.ts` (+21) deltas
   never landed; untracked `ask-loop-gaps.test.ts`. TRIAGE: diff against
   canonical+dirty, harvest non-overlapping gap coverage, then delete the
   worktree checkout.
2. Tenanos wave branches P-089/091/092/095/098/100/103/104-105 + integration:
   2026-09-23, clean, stranded. Harvest list: P-098 contract (C2), P-091
   auto-resolvers (C8), P-092 kit mechanics (C13), P-103 fencing + P-101
   reconciler (C9), P-095 run-state vocabulary (C10).
3. Design lanes 04/05/06/07/08 + render-wire + fix-evidence-ref +
   sprint-visual-v1: 2026-09-26, unmerged. Harvest list in C3/C7. The
   `projectForViewer` split and `render-projection.ts` need explicit
   adopt/reject.
4. `fyd/builder-rebuild-v1` (+ ops cherrypick): needs the builder
   convergence WorkOrder (C6/C17).
5. `constitutional-convergence-v2`: 12 dirty, 2026-09-23, unexamined by this
   lane. UNKNOWN content value; preserved, not triaged.
6. Nine unpushed constitutional-runtime commits (trunk @ 74fbb74): object
   absent from the canonical repo. UNKNOWN location. Not declared absent;
   carried as UNKNOWN.
7. Ops-root dups with UNKNOWN provenance: `~/workspace/why-this-steps.ts`
   (+ test), `whythis-renderer.patch`. Establish provenance before any use.
8. Pig ops repo dirty state (1719 lines at 9652896, per lane 9): out of this
   lane's scope, flagged for the coordinator.
9. `/home/nolan/worktrees/lane-e-ask` (detached, 12 dirty, 2026-09-24):
   superseded; delete after confirming nothing unmerged (spot check only,
   read-only).
10. Local skeleton `/home/nolan/projects/ping-worktrees/contextpack-2026-09-28`
    (this sandbox): empty `src/app`, not a git checkout. Remove or ignore;
    the real worktree is on the Pig.

## 5. NAMING COLLISIONS (same name, different semantic unit)

- "ContextPack": patch branch `mc-context-pack.ts` (dispatch evidence pack
  for ORCA) vs tenanos P-098 `context-pack.ts` (memory retrieval to worker
  pack). Different units. Rename the memory one on adoption.
- "front door": `p0/front-door-idempotency` vs `mc/frontdoor-hardening` vs
  the dirty dispatch slice. Same unit, three implementations (see C9).
- "presence": canonical `src/fyd/presence/` (visual identity) vs
  lane-p01 worktree name `fyd/lane-p01-presence-compiler` (the branch that
  birthed it, now merged; the worktree is stale).
- "journal": `tools/fyd-journal-gateway` (FYD demo journal, :18199) vs the
  main PING gateway (:8080) vs `workerH/tenantos-journal-merge`. Different
  units; do not conflate in WorkOrders.

## 6. DUPLICATION DEFECTS (confirmed or strongly indicated; retirement needed)

D1. MC dispatch idempotency front door x3: dirty tree slice,
   `p0/front-door-idempotency`, `mc/frontdoor-hardening`. ACTION: diff all
   three, keep the dirty tree's tenant-aware version, retire the other two
   branches.
D2. Digest formulations x3: `digest.ts` (dirty), `dev-signer.canonicalizeJson`,
   compiler-local `sha256Hex`. ACTION: explicit pinning decision on the
   undefined-key question, then delete two.
D3. Builder homes x9+ (C17). ACTION: convergence WorkOrder with pairwise
   diffs; no new builder home meanwhile.
D4. `why-this-steps.ts` in canonical tree vs ops repo root. ACTION:
   provenance check, delete the loser.
D5. Ask FYD lineage: canonical+dirty vs ask-loop worktree dirty delta.
   ACTION: triage diff (register item 1), then delete the worktree.
D6. Decision classification: lane-11 surface inventory vs P-091 decision
   budget. ACTION: verify overlap; likely harvest-and-retire P-091.
D7. Tenant kit: canonical `src/fyd/tenant/` vs P-092. ACTION: diff,
   harvest, retire branch.
D8. Stale ancestor worktrees (lane-p01, lane-fyd-010, workerE, workerF,
   ask-loop, authority-ux): all merged, checkouts lingering. ACTION: after
   confirming clean/merged state, remove worktrees to shrink the forest.

## 7. WHAT WOULD FALSIFY THIS MAP

- A clean-checkout replay showing any "merged" branch is NOT actually an
  ancestor of 0264d517 (merge-base was computed on the live repo; a
  corrupted or concurrently-modified repo would invalidate it).
- Served-bytes inspection showing :3100 serves something other than the
  2026-09-27 21:00:32 build (runtime evidence fields assume lane 9's
  observation).
- B13's dirty-tree.patch proving incomplete (it excluded build dirs, media,
  pycache; a capability hiding in an excluded path would be missed).
- Any worktree written between this lane's last probe (~16:05 MDT) and the
  reader's use: re-run `git worktree list` + `git status --porcelain`
  before acting.
- The ask-loop dirty delta overlapping the dirty batch's `visitor-answer.ts`
  changes would collapse D5 into "already converged"; the triage diff
  decides.
- Discovery of the 74fbb74 commits would rewrite register item 6.

## 8. OPEN UNKNOWNS (held, not collapsed)

- Location and content of the nine unpushed constitutional-runtime commits.
- Post-dirty test-suite state (last full run predates the dirty batch).
- Whether the dirty batch's `visitor-answer.ts` changes subsume the
  ask-loop worktree's dirty `visitor-answer.ts` delta.
- Functional overlap between canonical `src/fyd/builder/` and
  `fyd/builder-rebuild-v1` (no pairwise diff performed).
- Overlap between lane-11's decision inventory and P-091's decision budget.
- Provenance of ops-root `why-this-steps.ts` / `whythis-renderer.patch`.
- Content value of `constitutional-convergence-v2` (12 dirty, unexamined).
- Pig ops repo 1719-line dirty state (out of scope, flagged).
- Live runtime behavior of every dirty-batch capability (served build is
  pre-dirty; no live probes performed by this lane).

## 9. HOW TO USE THIS FILE (for future WorkOrders)

1. Find your capability in section 2. Read CANONICAL CURRENT IMPLEMENTATION
   first.
2. Check WORKTREE ALTERNATIVES and DIRTY ALTERNATIVES: if 70 percent of what
   you need exists, your WorkOrder's EXISTING IMPLEMENTATIONS FOUND field
   must name them and WHY THIS WRITE IS STILL NECESSARY must be non-empty,
   or there is no write.
3. Check section 3: if the unit has an ACTIVE WRITER, coordinate; do not
   create a second writer. If it is CONTESTED, the decision comes before
   the code.
4. Check section 6: if your unit is a listed duplication defect, your job
   is convergence (diff, pick winner, retire loser), not a third
   implementation.
5. Re-verify liveness: `git worktree list`, `git status --porcelain`, and
   the served build timestamp before acting. This map is a hypothesis
   dated 2026-9-28 ~16:05 MDT.
