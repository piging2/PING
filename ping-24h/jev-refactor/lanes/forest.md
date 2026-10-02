# LANE FOREST: Broad Implementation Inventory

**Date:** 2026-09-28 ~18:30 MDT. **Mode:** read-only. No code created, modified, committed, or pushed. Report is the only write.
**Scope:** everything the 8 jev-autonomy lanes did NOT cover: pig worktrees, dirty/untracked/stashed/dangling work, tenanos-wave branches and impl dirs, the second git repo (/home/nolan/workspace, mirrored to this VM), local VM dirs outside jev-autonomy.
**Prior work extended, not redone:** `~/workspace/ping-24h/jev-autonomy/JEV_PING_AUTONOMY_MAP.md` (8 lanes, canonical tree @0264d517) and `ORCA_DECISION_INVENTORY.md`. Findings already in those maps are referenced, not re-argued.

## 1. Enumeration results

### 1a. Pig worktrees: /home/nolan/worktrees/ (38 total)

All are git worktrees of `/home/nolan/projects/ping` EXCEPT copper-v2 and fyd-privacy-p0 (broken worktree metadata; see 1c). Format: branch, HEAD subject, dirty count, commits ahead of main.

| Worktree | Branch | HEAD | Dirty | Ahead |
|---|---|---|---|---|
| arrow1-gate | copilot/arrow1-claims-gate | 87671a5f FYD object presence: page-anchored edge mode | 2 | 87 |
| arrow1-hostile | copilot/arrow1-hostile-proof | 87671a5f (same) | 2 | 87 |
| arrow6-sitepatch | copilot/arrow6-sitepatch | f052e6b5 Arrow 6: exact object title wins over shorter fuzzy match | 3 | 88 |
| authority-ux | copilot/authority-ux | 87671a5f (same) | 2 | 87 |
| constitutional-convergence | constitutional-convergence-v2 | 5aa33dcca fix(build): multi-stage Dockerfile | 51 | 316 |
| constitutional-convergence-authority-law | constitutional-convergence-authority-law | 1995f0a59 feat(events): collision-safe event identity | 10 | 276 |
| design-lane-04-composition | design/lane-04-composition | a4cd616c Lane 04: graph-measured composition compiler | 1 | 96 |
| design-lane-05-media | design/lane-05-media | 06774159 Lane 5: media intelligence v1 | 1 | 96 |
| design-lane-06-typography | design/lane-06-typography | e3af1d89 Lane 6: globals.css banner wording | 1 | 97 |
| design-lane-07-motion | design/lane-07-motion | 6cef9c4d lane-07: FYD motion primitives | 1 | 96 |
| design-lane-08 | design/lane-08-public-projection | 6ab560c3 lane-08: separate public and debug projections | 1 | 96 |
| design-lane-polish-f1 | design/lane-polish-f1 | cd280d39 visitor-projection purity and conversion fixes | 1 | 110 |
| design-lane-render | design/lane-render-wire | 832b0148 wire lane-4/6/7 vocabularies into renderer | 1 | 106 |
| design-sprint-visual-v1 | design/sprint-visual-v1 | 9c8c2193 merge design/lane-polish-f1 | 1 | 111 |
| fix-evidence-ref | design/fix-evidence-ref-current | 4c947384 stamp and check current evidence ref | 1 | 107 |
| fyd-family-converge | fyd/builder-rebuild-v1 | 4eb90401 Styling lane: real family CSS for Coppersmith | 1 | 50 |
| jev-failure-harness | jev-failure-mode-harness | 1822d5fae Lane B: thread mission tenant_id into scheduler | 2 | 292 |
| lane-e-ask | (detached) | e474c89b fyd-g4: capability propagation through authority | 12 | 35 |
| lane-fyd-010 | lane/fyd-010-context-projection | 9f9b79f8 FYD-010: Ask FYD context-projection boundary | 0 | 92 |
| lane-p01 | fyd/lane-p01-presence-compiler | 2bf1e5c9 Lane P-01: presence compiler | 1 | 92 |
| orca-autonomy | feature/orca-autonomy | a2b2e9f1e ORCA: stale docstrings to H5 crash-window law | 4 | 248 |
| phase1-approval-door | phase1/approval-door-2026-09-28 | af7d2688 phase1: terminal-first ratification | 1 | 112 |
| phase1-replay-check | (detached) | af7d2688 (same) | 1 | 112 |
| ping-codex-convergence | codex/context-workorder-convergence | 08c3036d9 fix(temporal): worker lifecycle ownership | 0 | 252 |
| ping-event-runtime | event-runtime-deduplication | 1f40cf432 fix(events): collision detection for duplicate event IDs | 0 | 247 |
| ping-harvest-12h | sprint/harvest-12h | 8fe3b8060 test(context): knowledge_refs coverage | 0 | 320 |
| ping-observations | copilot/ping-obs-quarantine | 73d06b03c W7-qdrant-py: harvest 74fbb74 tenant enforcement | 2 | 290 |
| ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b4222467 fix(ui): hide fixture-backed missions board | 0 | 11 |
| replay-render-wire | (detached) | 832b0148 (same as design-lane-render) | 1 | 106 |
| side-visual-identity | (detached) | 42f81d53 Lane D: Mission Control dispatch UI/API vertical slice | 16 | 91 |
| workerF-edge-restore | workerF/edge-restore | 2839dd50 restore page-level margin/edge object layer | 1 | 52 |
| copper-v2 | UNKNOWN (metadata broken) | UNKNOWN | n/a | n/a |
| fyd-privacy-p0 | UNKNOWN (metadata broken) | UNKNOWN | n/a | n/a |
| prompts | not a git repo (copilot prompt files) | n/a | n/a | n/a |

Note: arrow1-gate, arrow1-hostile, authority-ux, l2-benchmark all sit at the same commit 87671a5f on sibling copilot branches. replay-render-wire and phase1-replay-check are detached at other branches' HEADs (duplicate checkouts).

### 1b. Frozen canonical tree: /home/nolan/projects/ping

- HEAD: f877c391 (trackc: 16 tests for the staged SitePatch pipeline). Tags: phase1-frozen-2026-09-28, tenanos-wave-base-20260923.
- Dirty: 144 porcelain lines (was 146 at the 16:05 MDT dirty-mc-freeze; delta is 2 lines, unexplained but small). Already inventoried by another lane in `~/workspace/ping-24h/dirty-mc-freeze-2026-09-28.md`; not re-listed here. Heaviest dirty areas: src/fyd/ask (tests + pipeline), src/lib/ping, src/app/api/mc/_lib, tools/fyd-journal-gateway, src/fyd/tenant tests, src/fyd/proceduralize fixtures.
- Stash: 1 entry, `stash@{0}: On fyd-factory: fyd-sprint-2026-09-24-pre-purehead-dirty-state`, 18 files (package.json, src/app/*, src/fyd/owner-mode/gate.ts, src/fyd/proceduralize fixtures, src/middleware.ts, tools/fyd-journal-gateway/server.mjs). A preserved pre-purehead dirty state from 2026-09-24, never restored.
- Dangling commits: 10 shown, all "WIP on ..." auto-commits (e.g. be03028a 2026-09-27 WIP on fyd/sprint-integration-2026-09-24; a705aa35 2026-09-26 WIP on design/lane-04-composition). They are orphaned stash-like WIP states of branches that were later integrated. Low harvest value; SUPERSEDE.
- Branches of note carrying unmerged focus-unit implementations (all local-only, `+` prefix = unpushed): tenanos-wave/P-20260923-001, 012, 089, 091, 092, 095, 098, 100, 103, 104-105; decision-fabric/contextpack-wire-2026-09-28; lane/fyd-010-context-projection; lane/bcq-connector-substrate; lane/l-secret-broker; hardening/2026-09-28-vocab-ssrf (current HEAD branch).

### 1c. Second git repo: /home/nolan/workspace (mirrored to /home/hatch/workspace)

This repo was NOT covered by the 8 lanes. It is the workspace repo itself, with 40+ local branches. Current branch: security/secret-redaction-2026-09-28. Implementation-relevant branches:

- jev/shadow-recorder: "Jev shadow-mode decision recorder (schema, tests, 3 demo records, MC event spec)"
- mc/approval-request: "P0 W4: harvest ApprovalRequest primitive + proposal validator + approval CLI"
- mc/lane-c-reconcile-gate: "lane-c S5: reconcile gate on the dispatch path (P4 RETRY-AFTER-UNKNOWN closure)" + canonicalization_service.js + tenant-threading-selftest.js
- feat/orca-unknown-outcome-port: ORCA per-class effect adapter layer (adapter_core.js 590 lines, class_05c/05d/08/09, tests)
- mc/mission-budgets, mc/pass-migration-proof, mc/pass-migration-supersession, mc/tenant-hardening, mc/tenant-hostile-tests, mc/frontdoor-hardening, mc/consequence-policy-input, mc/audit-payload-lifecycle
- substrate/gap1-F1-lane-e-floats, gap1-F6-lane-e-keyorder, gap1-canonical-conformance, gap2-provenance-ref, gap3-journal-identity, gap4-binding-lint, gap5-probe-health
- track-a/d1-monitors, d2-schedule, d3-igprefilter, d4-spool (each with work+replay worktree pairs)
- p0/approval, p0/front-door-idempotency, spine/x-pass-reached-path
- Stale prunable worktrees: 16 entries (ar-cac, fd537, gap1-f1, gap2-provenance, substrate-gap4/5, tenant-hostile, track-a/* pairs, audit-beyond-backlog-2026-09-19, gap1-F2-absorb-floats, mc-budget-repair, mc-pass-migration-proof, refalsify-budget, falsify-consequence-55b5d89, repair-consequence). DELETE-LATER candidates after confirming no unique uncommitted work.
- copper-v2 and fyd-privacy-p0 in /home/nolan/worktrees/ are this repo's worktrees with broken metadata (.git files point to /home/nolan/workspace/.git/worktrees/{copper-v2,fyd-privacy-p0}, which does not exist). Their branch/HEAD is UNKNOWN. The dirs contain full workspace mirrors (AGENTS.md, BACKLOG.md, fyd-product-lane/). Treat as orphaned checkouts: inventory before any cleanup.

### 1d. Dirty-file spot checks (worktrees)

- constitutional-convergence (51 dirty): 5 tracked modifications (gateway/append_orchestrator.js, gateway/authority_registry.js, dormant_classifications/_summary.json, capability_registry.json, canonical_workers.js) plus ~46 untracked event_queue/*.json files and test scripts (test_replay*.js, test_honest_loop.js, test_canonical_pipeline.js, patch_lineage*.py). The event_queue JSONs look like a live runtime event spill, not source.
- lane-e-ask (12 dirty): tracked edits to ask-pipeline.ts, answer.ts, context-builder.ts, types.ts, visitor-answer.ts, site-bundle.ts, field-visibility.ts, ask-composer.ts; untracked field-conflicts.ts + 2 test files + node_modules (bloat).
- side-visual-identity (16 dirty): tracked edits to object page/card/media files; untracked object-visual.tsx, manifests, run-ingest-supplied.ts, tests, .supplied/, node_modules, public/fyd-media/* (bloat).
- arrow6-sitepatch (3): node_modules + task.done + task.result.jsonl (copilot task residue).

### 1e. tenanos-wave (pig /home/nolan/workspace/tenanos-wave/)

- STATE.json: base fyd-factory @ e48ef710cb889bf4d59b833ef9766067a9e2bb9f0; integration branch tenanos-wave/integration.
- Proposal statuses: P-001..P-009, P-011..P-014, P-081..P-102, P-106, P-108 "integrated"; P-010 "rejected"; P-081 "rejected_from_wave"; P-104, P-105 "written" (not integrated).
- impl/ dirs present for P-002..P-009, P-011, P-013, P-014, P-088, P-090, P-099. Branch-form proposals P-089 (memory-candidate), P-091 (decision-budget), P-092 (tenant-kit), P-095 (run-state), P-098 (context-pack), P-100 (bootstrap), P-103 (attempt-fencing), P-104/105 (security) exist as frozen-repo branches (1b).

### 1f. Local VM dirs inventoried

jev/ (verdict-authority patches: patch_verdict_authority.py, patch_verdict_1b/1c/2/3.py, test_verdict_authority.js, patch_replay_precedence.py), jev-archaeology/ (work-laneA..D), jev-eval/ (backlog-dataset, completion-corpus, replay-dataset, privacy-envelope.md), jev-stage/ (typed_decision.js, shadow_worker.js, test_jev_shadow.js), fyd-intel/ (jev_ask.py, jev_contract.py, model_contract.json, jev-decisions.jsonl, spend-ledger.jsonl), ping-decision-fabric/ (falsify-contextpack.ts, staging/mc-context-pack.ts + test), ping-decision-seam/ (shadow-decisions-2026-09-28.json), mission-control/ (lane-d/adapter-call.js, LANE-D-DISPATCH.md, OBSERVABILITY-MISSION-CONTROL.md, mission_intent.py), orca-adapter/ (covered by prior lane), orca/ (hold-verify.js, unknown-outcome-experiments/, effect-classes/, verify-matrix.js), f01-fix/ + f01-test/ (HOLD reaper), ops-watches/ (gateway-classify.sh, check-gateway-health.sh), git-ingestion/ (design/findings/threats docs only; code is patch7_real_intake.py at workspace root), tenant-os/ (marketing page only), trackc-tenant-backup/, outreach/learnings.md.

Correction to the prior map: it cites `~/workspace/ping-runtime/jev/typed_decision.js`; that path does not exist on this VM. The file lives at `~/workspace/jev-stage/typed_decision.js` (sha fde15d42, identical to worktree copies).

## 2. Implementation inventory

Legend for REACHED?: LIVE (executed in a live path), SHADOW (tested/proven, not wired), DEAD (abandoned copy or superseded), UNKNOWN. TESTED?: test evidence seen. Columns: SEMANTIC UNIT / OWNER / IMPLEMENTATION / SHA / WORKTREE / REACHED? / TESTED? / STRONGER COMPETITOR? / ACTION.

### Identity convergence

| Unit | Owner | Implementation | SHA (short) | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| IdentityAuthority (JS runtime) | PING runtime | ping-runtime/authorities/identity_authority.js | c05060d0 | ping-codex-convergence, ping-observations, constitutional-convergence-authority-law (byte-identical x3) | DEAD (worktree forks of CRX lineage) | unknown | canonical-identity-service.ts in same trees; canonical tree identity files | CONVERGE: dedupe to one canonical file |
| Canonical identity (TS kernel) | PING runtime | runtime/kernel/identity/{canonical-identity.ts, identity-authority.ts, canonical-identity-service.ts} | (not hashed) | ping-observations, jev-failure-harness, ping-codex-convergence | DEAD (worktree forks) | identity-authority.test.ts exists in ping-observations | none identified | CONVERGE with JS authority above; pick one identity mint |
| Identity law (doctrine) | Nolan/PING | vault/laws/IDENTITY_LAW.md (+ constitutional/immutable copy) | n/a | ping-codex-convergence et al | SHADOW (doctrine, referenced) | n/a | n/a | KEEP (doctrine) |
| Tenant-scoped identity/namespace | TenantOS wave | src/tenanos/tenant/{namespace-binding.ts, tenant-context.ts, tenant-scope.ts, bridge-tenant.ts} | n/a (branch) | frozen repo branch tenanos-wave/P-20260923-092-tenant-kit | SHADOW (556 lines, tests) | tenant-kit.test.ts (149 lines) | canonical tree src/fyd/tenant/tenant-context.ts | HARVEST: design/code newer than canonical tenant-context |
| Object identity law (FYD) | FYD | src/fyd/object-identity/IDENTITY-LAW.md | n/a | copper-v2 (fyd-product-lane) | UNKNOWN (orphan checkout) | n/a | n/a | FREEZE: inventory with copper-v2 before cleanup |

### Tenant isolation

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| Tenant context + scoped stores | PING/FYD | src/fyd/tenant/{tenant-context.ts, scoped-stores.ts} + e-scoped-stores.test.ts | carried | every design worktree (identical carry from canonical tree) | LIVE (canonical tree) | yes (e-scoped-stores) | P-092 tenant-kit (newer, unmerged) | KEEP canonical; CONVERGE the dozen copies |
| Tenant gate + dispatch identity | PING/MC | src/app/api/mc/_lib/{mc-tenant-gate.ts, mc-dispatch-identity.ts} (untracked) | n/a | frozen tree (dirty, per dirty-mc-freeze) | SHADOW (uncommitted) | unknown | n/a | WIRE or FREEZE per owner call; currently dirty |
| Tenant filter patches | TenantOS wave | tenanos-wave/impl/P-20260923-088: gateway/lib/tenant-context.js + patch-01..04 diffs (event query namespace, mission runtime tenant scope, MC routes gate, POST missions) | n/a | pig workspace tenanos-wave/impl | SHADOW (patch form, ledger "integrated") | tenant-context.unit.test.js, tenant-filter.verify.md | canonical tenant-context.ts | HARVEST: the 4 diffs are a concrete threading checklist |
| Tenant hostile tests | MC | branches mc/tenant-hostile-tests, mc/tenant-hardening | n/a | workspace repo (branches) | SHADOW | unknown | n/a | HARVEST before branch cleanup |
| Tenant isolation tests (pg + vector) | PING | wb-test_tenant_postgres_isolation.js, wb-test_tenant_vector_isolation.js | n/a | local workspace root | SHADOW | self (are tests) | n/a | KEEP |
| Tenant backup/prep | trackc | trackc-tenant-backup/{backup, tenant-prep} | n/a | local | UNKNOWN | unknown | n/a | FREEZE: assess before use |

### GitHub ingestion

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| Patch 7 one-shot scan pipeline | PING | ~/workspace/patch7_real_intake.py + test_patch7_temporal_regression.py | n/a | local workspace root | SHADOW (one-shot, not live) | temporal regression test | none (no live ingestion) | KEEP (only ingestion code in existence) |
| Ingestion threat model + gates | PING | git-ingestion/threats/GIT-INGESTION-THREATS.md, findings/ECOSYSTEM-HARVEST.md | n/a | local git-ingestion/ | SHADOW (design) | n/a | n/a | KEEP |
| Live observation seam | PING | tandem/emit-observation.py (597 lines in workspace-repo branches) | n/a | workspace repo | LIVE (only live path into event spine) | tandem/tests/test-negative-signals-pipeline.py | n/a | KEEP |

### ContextPack / knowledge compilation

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| ContextPack (runtime cognitive) | PING runtime | runtime/cognitive/{context_pack.py, context_pack_cache.py} + context_pack_builder.py + CONTEXT_PACK_COMPATIBILITY_REPORT.md | 1cb71d44 | ping-codex-convergence, ping-observations, jev-failure-harness, ping-harvest-12h, constitutional-convergence-authority-law (byte-identical x5) | DEAD (worktree forks) | knowledge_refs coverage test in ping-harvest-12h | P-098 tenanos context-pack.ts | CONVERGE: 5 identical copies; pick one lineage |
| ContextPack (TenantOS memory) | TenantOS wave | src/tenanos/memory/context-pack.ts (172 lines + 149-line test) | n/a (branch) | frozen repo branch tenanos-wave/P-20260923-098-context-pack | SHADOW | context-pack.test.ts | runtime context_pack.py (older lineage) | WIRE/HARVEST: this is the newer typed implementation |
| ContextPack (MC staging) | decision fabric | ping-decision-fabric/staging/mc-context-pack.ts + mc-context-pack.test.ts | n/a | local ping-decision-fabric/staging | SHADOW | test present | P-098 (same unit, third copy) | CONVERGE with P-098; do not keep both |
| Context packets generator | PING runtime | ping-runtime/orchestration/generate_context_packets.js + ContextPackets.json | n/a | worktrees (x5) | DEAD | unknown | context_pack_builder.py | CONVERGE |
| Meta AI delegation packs | PING/tandem | tandem/build-context-pack.py + covered_names.py | n/a | workspace repo (in branch diffs) | LIVE | validator (pack names == validator rejects) | n/a | KEEP |

### Decision records

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| TypedDecision contract | PING/Jev | ping-runtime/jev/typed_decision.js (DecisionRequest, TypedDecision, RuleClaimDecisionProvider, MayExecutePolicy) | fde15d42 | jev-stage (local), ping-observations, jev-failure-harness (byte-identical x3) | SHADOW | test_jev_shadow.js, test_witness_adversarial.js | none | KEEP one; CONVERGE the copies (also fix the stale ~/workspace/ping-runtime/jev/ path in the map) |
| Shadow decision recorder | Jev | branch jev/shadow-recorder: schema, tests, 3 demo records, MC event spec | n/a | workspace repo branch | SHADOW | tests in branch | jev-decisions.jsonl (9 records, fyd-intel) | WIRE: this is the decision-record store the map said not to build; it already exists |
| JEV_DECISION_EVALUATED schema | PING | event_data schema v1 (lane 8 design) | n/a | design only | SHADOW | n/a | shadow-recorder schema (compare) | CONVERGE the two schemas |
| Leaf decision record | lane Q | evidence/lane-q-13-leaf-decision-record-2026-09-19.md | n/a | constitutional-convergence-authority-law | DEAD (evidence doc) | n/a | n/a | KEEP as evidence |
| Verdict authority patches | PING | jev/{patch_verdict_authority.py, patch_verdict_1b.py, patch_verdict_1c.py, patch_verdict_2.py, patch_verdict_3.py, patch_replay_precedence.py} | n/a | local jev/ | UNKNOWN (patches; applied?) | test_verdict_authority.js, test_replay_precedence.js | n/a | FREEZE: verify applied-or-not before any verdict work |

### Worker contracts / envelopes

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| WorkOrder 14-field + 8-field result envelope | Orca/PING | orca-adapter/adapter.js + vendor/external_agent_adapter.js (authorizeWorkOrder, verifyResultEnvelope) | n/a | local orca-adapter (prior lane) | LIVE | yes | none | KEEP (canonical worker surface) |
| Unified worker-contract comparison | lane 14 | ping-24h/lanes/lane14-worker-contract/report.md (+ raw/) | n/a | local | SHADOW (analysis) | n/a | n/a | KEEP as reference |
| Canonical event envelope | PING runtime | runtime/kernel/replay/canonical_event_envelope.ts, gateway/canonical_event_envelope.js, deterministic_failure_envelope.js, operational_envelope.js | n/a | ping-codex-convergence | DEAD (worktree fork) | test_canonical_envelope_time_authority.js | canonical tree envelope code | CONVERGE |
| ApprovalRequest primitive | MC | branch mc/approval-request: ApprovalRequest + proposal validator + approval CLI | n/a | workspace repo branch | SHADOW | unknown | phase1 gate.ts | HARVEST: compare with phase1 approval-door before any new approval work |
| Ask/social envelope (FYD) | FYD | src/fyd/{ask,social}/envelope.ts | carried | design worktrees (carry) | LIVE (canonical) | unknown | n/a | KEEP canonical |

### Mission Control projections

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| MC dispatch + identity + tenant gate | MC | src/app/api/mc/_lib/mc-dispatch.ts (modified) + mc-dispatch-identity.ts + mc-tenant-gate.ts (untracked) + dispatch/missions routes (modified) | n/a | frozen tree (dirty, frozen per dirty-mc-freeze) | SHADOW (dirty, uncommitted) | unknown | n/a | FREEZE: owner classification pending (KEEP/CHERRY-PICK/SUPERSEDED/DISCARD) |
| Lane D dispatch UI/API slice | MC | side-visual-identity worktree @ 42f81d53, 16 dirty files | n/a | pig worktree | SHADOW | object-visual tests | n/a | WIRE or FREEZE per owner call |
| Lane D adapter shim | MC | mission-control/lane-d/adapter-call.js (+ LANE-D-DISPATCH.md) | n/a | local | SHADOW (reconstructed W2) | W2 proof notes | n/a | KEEP |
| Pass-health projection | MC | apps/mission-control/pass-health/{projection.py, render.py} | n/a | workspace repo (mc/lane-c branch) | SHADOW | unknown | n/a | HARVEST |
| Phase 1 approval door | FYD/MC | src/fyd/approval/gate.ts @ af7d2688 (terminal-first ratification) + t2-gate-ferry-2026-09-28.tgz ferry copy | n/a | phase1-approval-door worktree; local tarball | SHADOW (ratified, CLOSED, not deployed) | acceptance-door.test.ts | mc/approval-request branch | FREEZE (closed lane); SUPERSEDE the tarball copy |
| FYD-010 context-projection boundary | FYD | lane/fyd-010-context-projection @ 9f9b79f8 (16/16 suites, 245/245 tests) | n/a | lane-fyd-010 worktree (clean) | SHADOW (integrated to canonical per log) | yes | n/a | KEEP |
| Mission intent lifecycle | MC | mission-control/mission_intent.py (validate->authorize->dispatch->observe, MC_LANE_UNKNOWN, revocation) | n/a | local + pig workspace | SHADOW | unknown | mission_hold_reaper | CONVERGE with reaper semantics |

### Outcome / learning records

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| outcomes.js | Orca | OUTCOME + EFFECT_STATE closed vocabulary | n/a | local orca-adapter (prior lane) | LIVE | yes | none | KEEP |
| Unknown-outcome experiments | Orca | orca/{hold-verify.js, unknown-outcome-experiments/, verify-matrix.js, effect-classes/} | n/a | local orca/ + pig workspace orca/ | SHADOW | verify-chaos.js | n/a | KEEP |
| ORCA unknown-outcome port | Orca | branch feat/orca-unknown-outcome-port: per-class effect adapters (adapter_core 590 lines, 4 classes, tests) | n/a | workspace repo branch | SHADOW | run_tests.js (466 lines) | n/a | HARVEST: the effect-adapter layer for unknown outcomes |
| Learnings log | outreach | outreach/learnings.md | n/a | local | SHADOW (record) | n/a | n/a | KEEP |

### Jev typed-decision code

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| typed_decision.js | PING/Jev | (same as Decision records row) | fde15d42 | x3 identical | SHADOW | yes | none | KEEP one |
| jev_ask.py + jev_contract.py + model_contract.json | fyd-intel | invocation contract, purpose gating, budget gate, pinned jev-1.13.0 | n/a | local fyd-intel (prior lane) | LIVE (shadow use) | test_jev_ask.py, test_model_contract.py | none | KEEP |
| J4 shadow executor-routing harness | Jev | jev-shadow-routing-domain branch (37/37 tests) | n/a | (prior lane) | SHADOW | 37/37 | none | KEEP |
| J7 fail-closed provider harness | Jev | jev-failure-mode-harness branch (18/18 tests) | n/a | pig worktree jev-failure-harness | SHADOW | 18/18 | none | KEEP |

### Restart / reconciliation

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| HOLD reaper (f01) | PING | f01-fix/mission_hold_reaper.invariant.test.js + HOLD_REAPER_EVIDENCE.md: HOLD non-dispatchable, reconciliation-only transitions, _failMission proven-failures-only | n/a | local f01-fix/ | SHADOW (21/21 green, never committed) | 21/21 | mc/lane-c-reconcile-gate S5 | WIRE: complete and green; needs commit/owner decision, not a rebuild |
| Reconcile gate S5 | MC | branch mc/lane-c-reconcile-gate: S5 reconcile gate on dispatch path (P4 RETRY-AFTER-UNKNOWN closure) | n/a | workspace repo branch | SHADOW | unknown | f01 reaper (compare) | CONVERGE with f01; two implementations of the same closure |
| reconcileGate | Orca | adapter.js:429/445 idempotency + prior-outcome + artifact-exists | n/a | local orca-adapter (prior lane) | LIVE | yes | none | KEEP |
| Attempt fencing | TenantOS wave | src/tenanos/run/attempt-fencing.ts (315 lines) + schema-attempt-fencing.sql + test (248 lines) | n/a (branch) | frozen repo branch tenanos-wave/P-20260923-103-attempt-fencing | SHADOW | attempt-fencing.test.ts | reconcileGate (different layer) | HARVEST |
| Run-state authority | TenantOS wave | src/tenanos/run/run-state-authority.ts (211 lines) + schema.sql + test | n/a (branch) | frozen repo branch tenanos-wave/P-20260923-095-run-state | SHADOW | run-state-authority.test.ts | n/a | HARVEST |
| Gateway bootstrap substrate | TenantOS wave | bootstrap/gateway-bootstrap-substrate.ts (434 lines) + test | n/a (branch) | frozen repo branch tenanos-wave/P-20260923-100-bootstrap | SHADOW | gateway-bootstrap-substrate.test.ts | n/a | HARVEST |
| recover.ts | TenantOS wave | tenanos-wave/impl/P-20260923-013/recover.ts + test | n/a | pig workspace impl | SHADOW | recover.test.ts | n/a | HARVEST |
| Wake lease | PING | pig/incident-2026-09-28/draft-wake-lease-design.md | n/a | local pig/ | DEAD (design doc only) | n/a | n/a | BUILD (if wanted) or DROP |

### UNKNOWN / HOLD handling

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| UNKNOWN discipline | Orca/PING | outcomes.js (UNKNOWN never collapses to FAILED) | n/a | prior lane | LIVE | yes | none | KEEP |
| HOLD reaper | PING | f01-fix (above) | n/a | local | SHADOW | 21/21 | n/a | WIRE |
| hold-verify.js | Orca | orca/hold-verify.js | n/a | local/pig orca/ | SHADOW | unknown | f01 | CONVERGE |
| MC_LANE_UNKNOWN + revocation | MC | mission_intent.py | n/a | local mission-control/ | SHADOW | unknown | n/a | KEEP |
| WAITING_APPROVAL triage | PING | coordinator procedure only; no code primitive exists | n/a | none | DEAD (never built) | n/a | n/a | BUILD (D1 candidate C-02 in the map) |

### Run observability

| Unit | Owner | Implementation | SHA | Worktree | Reached? | Tested? | Stronger competitor? | Action |
|---|---|---|---|---|---|---|---|---|
| gateway-classify.sh | ops | closed 10-reason failure vocabulary + sentinel rule | n/a | local ops-watches/ (prior lane) | LIVE | test-gateway-classify.sh | none | KEEP |
| check-gateway-health.sh | ops | WARN on UNKNOWN, consecutive-failure counter held at 0 | n/a | local ops-watches/ | LIVE | yes | none | KEEP |
| tripwire OBSERVATION_FAILED | swarm | tripwire.sh exit 3 on null/unparseable | n/a | (prior lane) | LIVE | yes | none | KEEP |
| MC observability doc | MC | OBSERVABILITY-MISSION-CONTROL.md | n/a | local + pig mission-control/ | SHADOW (doc) | n/a | n/a | KEEP |
| Eval corpora | Jev | jev-eval/{backlog-dataset (53), completion-corpus (16), replay-dataset} | n/a | local (prior lane) | SHADOW | n/a | n/a | KEEP |
| Shadow decisions log | decision fabric | ping-decision-seam/shadow-decisions-2026-09-28.json | n/a | local | SHADOW | n/a | jev-decisions.jsonl | CONVERGE the two shadow logs |

## 3. Action tally

63 implementation records inventoried across 12 focus areas (some rows carry dual actions, e.g. KEEP one copy + CONVERGE the rest; 67 action assignments total).

- KEEP: 26 (live canonical contracts, Patch 7, jev_ask contracts, ops watches, eval corpora, doctrine docs, FYD-010, lane-D shim, learnings)
- CONVERGE: 13 (byte-identical multi-copy units: typed_decision.js x3, context_pack.py x5, identity_authority.js x3, orca_policy.js x3, tenant-context/envelope/mc-dispatch carries in design worktrees, canonical envelopes, P-098 vs mc-context-pack, f01 vs lane-c S5, hold-verify vs f01, mission_intent vs reaper, two shadow logs, JEV_DECISION_EVALUATED vs shadow-recorder schema)
- HARVEST: 10 (P-092 tenant-kit, P-103 attempt-fencing, P-095 run-state, P-100 bootstrap, P-088 tenant patches, P-013 recover, mc/approval-request, orca-unknown-outcome-port effect adapters, mc/pass-health projection, tenant hostile tests)
- WIRE: 5 (f01 HOLD reaper, jev/shadow-recorder branch, P-098 context-pack.ts, dirty MC dispatch surface pending owner classification, Lane D slice pending owner call)
- SUPERSEDE: 3 (10 dangling WIP commits, t2-gate-ferry tarball vs ratified phase1 branch, copper-v2/fyd-privacy-p0 broken worktree metadata)
- FREEZE: 4 (phase1-approval-door closed lane, verdict-authority patches pending applied-check, copper-v2 IDENTITY-LAW.md and trackc-tenant-backup pending assessment)
- DELETE-LATER: 3 groups (16 prunable workspace-repo worktrees, node_modules bloat in lane-e-ask/side-visual-identity/arrow6-sitepatch, ~46 event_queue JSON spill files in constitutional-convergence)
- BUILD: 3 genuine gaps (WAITING_APPROVAL triage code primitive, live GitHub webhook ingestion D0 funnel, wake-lease implementation if wanted)

## 4. The 3 most surprising rediscoveries

1. **The HOLD/UNKNOWN reconciliation problem is solved twice and shipped zero times.** `~/workspace/f01-fix/` holds a complete HOLD reaper (21/21 tests green since 2026-09-24, never committed, no gateway cutover), and the workspace repo has `mc/lane-c-reconcile-gate` (S5 reconcile gate, P4 RETRY-AFTER-UNKNOWN closure). Meanwhile AGENTS.md still records "Reaper-vs-HOLD design gap (open, needs Nolan)". The gap is marked open while two implementations exist. Nothing needs to be built; one needs to be chosen and committed.

2. **The frozen repo's tenanos-wave branches are a finished implementation cache, not proposals.** P-092 tenant-kit (556 lines: namespace-binding, tenant-context, tenant-scope, bridge-tenant), P-098 context-pack.ts (321 lines, TenantOS memory), P-103 attempt-fencing (627 lines + SQL), P-095 run-state-authority, P-100 gateway bootstrap substrate (549 lines) all sit as local-only unmerged branches. STATE.json marks most "integrated", but they are not in the canonical tree at f877c391 and the branches are unpushed. Any new tenant-isolation, context-pack, or restart work that does not read these first will rebuild them a second time.

3. **The second git repo nobody inventoried.** /home/nolan/workspace (mirrored to this VM) is its own repo with 40+ branches implementing focus units the 8 lanes never saw: jev/shadow-recorder (decision-record schema + tests + MC event spec, the exact store the autonomy map said "deliberately not created"), mc/approval-request (ApprovalRequest primitive + validator + CLI), feat/orca-unknown-outcome-port (per-class effect adapters), mc/lane-c-reconcile-gate. On top of that, typed_decision.js, context_pack.py, identity_authority.js, and orca_policy.js are each byte-identical across 3 to 5 worktrees with zero divergence, the purest CONVERGE case in the forest: one file, many copies, no differences to reconcile.

## 5. Notes and caveats

- copper-v2 and fyd-privacy-p0 worktree metadata is broken on the pig (.git files point at nonexistent admin dirs). Their branch, HEAD, and dirty state are UNKNOWN. They contain full workspace mirrors including fyd-product-lane and an object-identity IDENTITY-LAW.md. Inventory their contents before any cleanup.
- The 16 prunable workspace-repo worktrees are stale metadata (mostly detached HEADs from other machines). Confirm no unique uncommitted work inside the live ones (track-a pairs, mc-budget-repair, gap1-F2-absorb-floats) before pruning.
- constitutional-convergence's 51 dirty files are dominated by an event_queue/*.json spill (runtime output, not source). The 5 tracked modifications (append_orchestrator.js, authority_registry.js, capability_registry.json, canonical_workers.js, _summary.json) are the real signal.
- The autonomy map's path `~/workspace/ping-runtime/jev/typed_decision.js` is stale; the file is at `~/workspace/jev-stage/typed_decision.js`.
- FYD surface work was out of scope; design-lane worktrees were inventoried for branch/HEAD/dirty only, not for FYD feature content.
- Happy Place original was not touched in any way.
- No secrets were read or logged. SSH used the standing pigwsl stdin-fed batch pattern; one UNREACHABLE-class retry was not needed (transport healthy, outside commute windows).
