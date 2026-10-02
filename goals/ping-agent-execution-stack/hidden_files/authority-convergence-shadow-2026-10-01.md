# Track B — Authority-Convergence Shadow Dataset (2026-10-01)

Read-only/shadow worker report for the phase-2 proving slice, steps 8-11.
No database writes, no events emitted, no runtime-tree changes, no scheduler
starts, no commits. Jev shadow only (no model endpoint exists; distributions PENDING).

## Method

Four read-only probe scripts ran on the Pig via `~/workspace/bin/pigwsl-exec`
against `/home/nolan/ping/ping-runtime` (repo HEAD `1d4ea59d0`, matches phase-1):

1. File inventory (line counts), exported symbols, class-name and path require
   graphs (static `require('...')` plus a dynamic `require(path.join(...))`
   sweep), hot-path reference counts inside the four dispatch-path files
   (`orchestration/mission_runtime.js`, `orchestration/mission_scheduler.js`,
   `workers/worker_runtime.js`, `events/unified_event_runtime.js`), test-file
   references, entry-point lookup, gateway container inspection, git status.
2. Class-name require graph, per-file headers (purpose comments), dormant-stack
   and connectors listings, delegation checks, gateway `/app` staleness check.
3. Precise require() direction per target basename, generate-script require
   lines, approval-authority require reality, typed_decision exports,
   shadow_worker wiring, knowledge_promoter direction, context_compiler on hot
   path, worker_memory contents, scheduler entry search, bridge wiring.
4. DI wiring of the hot path: require lines + constructor signatures of the hot
   files, instantiation sites (`new X(...)`) tree-wide, workers listing,
   `.register()` call sites, scheduler poll-loop evidence, loose require sweep.

Probe scripts live in `/tmp/trackb-probe*.sh` (local) and
`/home/nolan/probe/trackb-probe*.sh` (Pig); raw outputs in
`/tmp/probe-out/trackb-probe*.txt`. Nothing was written inside the runtime tree.

## Labelled set: 14 examples

Closed label set: CANONICAL_AUTHORITY, ADAPTER, LEGACY, DORMANT, DUPLICATE, UNKNOWN.
Full records (question, evidence digest, allowed labels, forensic answer, Jev
PENDING, human PENDING, outcome pending) are in
`authority-convergence-labels-2026-10-01.json`.

| # | Component | Machine evidence (summary) | Forensic label | Rule output | Agree |
|---|-----------|---------------------------|----------------|-------------|-------|
| 1 | `connectors/capability_registry.js` (277 ln) | exports `CapabilityRegistry` (provider metadata, from `constitutional_capability_contract`); **0 require consumers** tree-wide; 0 hot-path refs; 0 test refs | DORMANT | DORMANT (R2) | YES |
| 2 | `orchestration/execution/capability_registry.js` (312 ln) | exports `CapabilityRegistry, validateCapability`; worker->capability index vs generated JSON; sole consumer `execution/engine.js` (dormant stack) | DORMANT | DORMANT (R3) | YES |
| 3 | `runtime/capability_resolver.js` (127 ln) | exports `CapabilityResolver`; loads+validates+hashes generated JSON; **0 require consumers** | DORMANT | DORMANT (R2) | YES |
| 4 | `orchestration/mission_runtime.js` (715 ln) | `MissionRuntime`; deterministic IDs, transitions, 60s leases, HOLD overlay; only in-tree instantiation is the `resolve-hold` CLI; production wiring is DI from an external bootstrap | CANONICAL_AUTHORITY | UNKNOWN (R4) | NO |
| 5 | `events/unified_event_runtime.js` (519 ln) | `UnifiedEventRuntime`; single emit choke point, deterministic IDs, tenant isolation; 0 require consumers (DI-wired) | CANONICAL_AUTHORITY | DORMANT (R2) | NO |
| 6 | `orchestration/mission_scheduler.js` (974 ln) | `MissionScheduler`; 5s poll loop, static `MISSION_WORKER_MAP`, fail-closed dispatch, consumes `failure_record`; 0 require consumers | CANONICAL_AUTHORITY | DORMANT (R2) | NO |
| 7 | `workers/worker_runtime.js` (201 ln) | `WorkerRuntime`; `register`/`dispatch` -> structured receipt; **zero require() lines at all** (pure DI) | CANONICAL_AUTHORITY | DORMANT (R2) | NO |
| 8 | `evidence/evidence_authority.js` (180 ln) | retrieval-stage accumulate/verify/rank; 0 non-test consumers; 0 hot-path refs | DORMANT | DORMANT (R2) | YES |
| 9 | `temporal/` stack (4 files) | workflow + activities + index + own test; 0 dir-requires; refs only inside `temporal/`; directive forbids adoption | DORMANT | DORMANT (R2) | YES |
| 10 | `orchestration/index.js` (113 ln) | `ConstitutionalOrchestrator`; wires dormant stack; `main()` is a self-report harness; 0 consumers | DORMANT | DORMANT (R2) | YES |
| 11 | `jev/typed_decision.js` (189 ln) | `DecisionRequest`/`TypedDecisionProvider`/`RuleClaimDecisionProvider`/`MayExecutePolicy`; sole consumer is the unwired `jev/shadow_worker.js`; never consulted by dispatch | ADAPTER | UNKNOWN (R4) | NO |
| 12 | `approval/business_action_authority.js` + `effect_authority.js` (139+134 ln) | 2026-09-30 forensics header: "UNWIRED in-memory classes... NOT used here... Do not wire them here"; 0 non-test consumers; no `EFFECT_*` vocabulary exists | DORMANT | DORMANT (R2) | YES |
| 13 | `feedback/feedback_contract.js` (320 ln) | W9 learning-gate contract; 0 non-test consumers; no implementing consumer found | DORMANT | DORMANT (R2) | YES |
| 14 | `orchestration/event_to_mission_bridge.js` (158 ln) | `EVENT_MISSION_MAP` event->mission translation; DI constructor `{eventRuntime, missionRuntime}`; calls `missionRuntime.create()`; 0 require consumers; 0 in-tree instantiation sites | ADAPTER | DORMANT (R2) | NO |

Forensic label counts: DORMANT 8, CANONICAL_AUTHORITY 4, ADAPTER 2, LEGACY 0, DUPLICATE 0, UNKNOWN 0.

## Deterministic-rules baseline

Script: `/tmp/trackb-rules.py` (scratch only; NOT in the runtime tree, NOT in
hidden_files per the no-extra-writes fence). It reads the labels JSON and applies
an ordered rule set over require()-graph features only:

- **R1**: >=1 non-test require() consumer that is itself a hot-path file -> CANONICAL_AUTHORITY
- **R2**: zero non-test require() consumers -> DORMANT
- **R3**: every non-test consumer under a known-dormant dir (`orchestration/execution/`, `temporal/`) -> DORMANT
- **R4**: otherwise -> UNKNOWN

Per-example outputs are in the table above.

**Agreement: 8/14 = 57.1%. Disagreement: 6/14.** All six disagreements point one
way: the rules under-label components whose liveness comes from
dependency-injection wiring or from adapter role-shape (rules say
DORMANT/UNKNOWN; forensic says CANONICAL_AUTHORITY x4, ADAPTER x2).

## Calibration-relevant stats (raw counts; n=14 is small, no inflated metrics)

- Overall exact-match agreement (rules vs forensic): 8/14.
- On forensic-DORMANT (8): rules agree 8/8 (100% of the dormant call is mechanical).
- On forensic-CANONICAL_AUTHORITY (4): rules agree 0/4.
- On forensic-ADAPTER (2): rules agree 0/2.
- Rule abstention (UNKNOWN): 2/14 (#4 mission_runtime, #11 typed_decision).
- Brier score / calibration error / coverage-at-risk-threshold: NOT COMPUTABLE.
  The rules emit hard labels, not probabilities, and Jev distributions are
  PENDING (no model endpoint exists). Nothing here should be read as a
  calibrated claim.
- Label-space coverage in this slice: LEGACY 0, DUPLICATE 0, UNKNOWN 0
  (forensic). The three capability registries turned out to be
  layer-separated (connector provider metadata / dormant-stack worker index /
  generated-JSON resolver), not duplicates of one concern; no clear LEGACY case
  surfaced.

## Structural findings (machine-grounded)

1. **The hot path is wired by dependency injection, not require().**
   `workers/worker_runtime.js` has zero require() lines; the four hot-path
   files require only `crypto` and `authorities/*` plus `failure_record` (scheduler).
   Constructors take `options = {}`. No production bootstrap instantiates
   MissionScheduler/WorkerRuntime/UnifiedEventRuntime/EventToMissionBridge
   anywhere in the runtime tree (only `resolve-hold-cli.js` instantiates
   MissionRuntime, via dynamic `require(path.join(...))`). Production wiring
   lives outside the tree (gateway). Any require-graph-only classifier is
   structurally blind to this; that is exactly what the 6 disagreements measure.
2. **Gateway container `/app` is a stale image.** `/app/ping-runtime` exists in
   the `ping-gateway` container (all three registry files present), but
   `/app/ping-runtime/orchestration/mission_runtime.js` md5 `7b46c11a...` !=
   host `dd47f9d6...`. Host tree is the source of truth, per tasking.
3. **Approval authorities are explicitly unwired by their own header.**
   `approval/approval_events.js` (2026-09-30 forensics) documents
   BusinessActionAuthority/EffectAuthority as "UNWIRED in-memory classes...
   Do not wire them here." Machine check confirms: zero non-test consumers.
4. **`orchestration/worker_memory/opencode` is a 0-byte file.** WorkerMemory has
   no content and no scheduler consumer (consistent with phase-1).
5. **`knowledge/knowledge_promoter.js` was examined and excluded** from the final
   14: `workers/canonical_workers.js:849` lazily requires it to register the
   'knowledge-promotion' worker, but no evidence establishes whether that
   registration path executes in production. Kept out rather than labelled on
   thin evidence.

## What is PENDING / UNKNOWN

- **Jev distributions**: PENDING for all 14. No Jev model endpoint exists; per
  the directive and tasking, nothing was fabricated.
- **AnyJev / open-alternative benchmark**: explicitly OUT of scope for this
  slice; pending Nolan's review after enough labels.
- **Verified/human answers**: PENDING for Nolan on all 14.
- **Calibration evaluation** (accuracy, Brier, ECE, coverage, abstention, cost,
  latency): blocked on the above; not computable from this slice.
- **Outcome** field: pending for all 14 until human verification lands.
- Whether the external (gateway-side) bootstrap actually instantiates the
  DI-wired canonical four in production: UNKNOWN from the runtime tree alone
  (would require reading gateway code outside the fenced scope).

## Outputs written

- `~/workspace/goals/ping-agent-execution-stack/hidden_files/authority-convergence-labels-2026-10-01.json` — the 14-example labelled dataset
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/authority-convergence-shadow-2026-10-01.md` — this report
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/decision-unit-envelope-experimental-2026-10-01.json` — DecisionUnit experimental envelope
