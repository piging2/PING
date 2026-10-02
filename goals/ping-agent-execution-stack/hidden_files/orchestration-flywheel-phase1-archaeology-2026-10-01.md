# PHASE 1 ARCHAEOLOGY — Orchestration Flywheel
Date: 2026-10-01. Read-only. No implementation, no wiring, no state changed.
Canonical runtime: `/home/nolan/ping/ping-runtime/` on the Pig, repo HEAD `1d4ea59d0`
("PING constitutional test ladder (Track 5, 2026-09-30)").

## ORCHESTRATION PATH (live, verified by reading the code)

Mission truth: Postgres `ping_missions` via `orchestration/mission_runtime.js` (715 lines,
class MissionRuntime). Deterministic mission IDs (sha256 of tenant:type:event or payload,
16 hex). Conditional transitions created→assigned→running→completed/failed, 60s leases with
`renewLease`, `reapExpiredLeases`, `failWithRetry` bounded backoff, `markHold`/`resolveHold`
(HOLD is a dispatch-eligibility overlay; only the reconciler exits it via
PROVEN_OCCURRED / PROVEN_NOT_OCCURRED / MANUAL_RESOLUTION). Emits
MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED via the event runtime.

Dispatch: `orchestration/mission_scheduler.js` (974 lines, class MissionScheduler). Poll loop:
renew leases → reap expired → reclaim retries → stuck-running watchdog → held-resolution
sweep → dispatch. Worker selection is a STATIC `MISSION_WORKER_MAP[mission.mission_type]`
(hardcoded, lines 56-95). Dispatch builds an event from the mission payload and calls
WorkerRuntime with a timeout. Fail-closed: SUCCEEDED only on positive completion evidence;
worker-reported failure → FAILED; falsy/no-receipt → UNKNOWN → `_reconcileUnknown` → HOLD
(never FAILED on timeout, never auto-retried). Phantom-complete prevention: label-worker
mismatch yields matched=false and terminal failure with no retry.

Execution: `workers/worker_runtime.js` (201 lines, class WorkerRuntime). Contract
`register(name, worker)` with `handle(event)`; `dispatch(event)` returns a structured
receipt `{matched, worker, routeExists, result}` carrying observed routing evidence.
Receipt has NO evidence/artifacts fields.

Events: `events/unified_event_runtime.js` (519 lines, class UnifiedEventRuntime). Single emit
choke point, deterministic event IDs, tenant isolation, verdict-class admission authority
(`jev-shadow` is the registered producer for JEV_DECISION_EVALUATED).

Intent→Mission: `orchestration/event_to_mission_bridge.js` (158 lines). Fixed
EVENT_MISSION_MAP (business events → mission types, e.g. OBSERVATION_CREATED →
CLAIM_GENERATE → CLASSIFICATION_CREATE → ... → LINEAGE_CREATE terminal). The ONLY
production mission creator besides tests. No intent primitive, no mission-creation API.

Evidence: `evidence/evidence_authority.js` (180 lines). Retrieval-stage only:
accumulate / verify / rank. Never mutates.

Context: `context/context_compiler.js` (175 lines). Builds deterministic ContextPacks
from a correlation group for mission execution. Not consulted by the scheduler.

Typed decisions: `jev/typed_decision.js` (189 lines) — DecisionRequest →
TypedDecisionProvider → TypedDecision → EvaluationRecord; RuleClaimDecisionProvider;
MayExecutePolicy hardwired shadow-only. `jev/shadow_worker.js` (103 lines) observes
CLAIM_CREATED, emits one shadow record per claim. NOT consulted by dispatch.

Approval: `approval/business_action_authority.js` (human approval gate for consequential
actions), `approval/effect_authority.js` (canonical effect identity for idempotent external
actions). Both exist. NEITHER is consulted in the MissionScheduler dispatch path.

Failures: `orchestration/failure_record.js` — mechanical derivation of typed failure
records from the mission row + dispatch outcome vocabulary. UNKNOWN never becomes FAILED.

Learning policy: `feedback/feedback_contract.js` — the W9 learning gate (identity
reduction, ≥10 independent tenants aggregation, materiality). Contract only; no
implementing consumer found.

`knowledge/knowledge_promoter.js` (72 lines) promotes only explicit HUMAN approvals
(SNIPPET_APPROVED, AI_RESPONSE_ACCEPTED, …) into knowledge-graph node updates. It does
NOT consume mission/worker outcomes.

## DURABLE STATE

- `ping_missions` (Postgres): mission rows, status, payload, result, leases, retries.
- `ping_events` (Postgres): canonical event journal; deterministic IDs; correlation_id
  threaded end to end by the bridge.
- Nothing else on the live mission path holds durable state. WorkerMemory is file-based
  JSON under `orchestration/worker_memory/` and is NOT consumed by the scheduler.

## CURRENT CHAIN BREAK (directive's 15-link loop, link by link)

1. INTENT → MISSION: BROKEN FIRST. No intent primitive. Missions are created only by the
   bridge from a fixed event map. Mission payload is an opaque JSONB; none of the
   directive's mission fields exist (objective, subtasks, dependencies, verification
   requirements, completion criteria, capabilities, criticality, reversibility).
2. MISSION → DECOMPOSITION: MISSING. The event-chain pipeline is a hardcoded linear map,
   not decomposition with subtasks/dependencies.
3. DECISIONS/QUESTIONS: EXISTS but shadow-only and domain-limited (claim classification);
   not consulted by the orchestration path.
4. EVIDENCE ACQUISITION: EXISTS (workers emit via UnifiedEventRuntime; EvidenceAuthority
   verifies on retrieval).
5. EXECUTION PLAN: MISSING as a primitive.
6. CAPABILITY/CONSEQUENCE POLICY: EXISTS as authorities, NOT enforced on the dispatch
   hot path.
7. WORKER SELECTION: EXISTS but STATIC (MISSION_WORKER_MAP). No empirical routing; no
   capability matching; WorkerMemory unconsumed.
8. EXECUTION: EXISTS (WorkerRuntime, structured receipts).
9. RESULT: EXISTS (receipt + result JSON on the mission row).
10. VERIFICATION: EXISTS (complete() only on positive completion evidence).
11. OUTCOME: PARTIAL (typed failure derivation exists; no OUTCOME OBSERVATION event or
    business-outcome classification consumed downstream).
12. CANONICAL RECORD: EXISTS (ping_missions + ping_events, deterministic IDs,
    correlation threading).
13. LEARNING: MISSING for mission outcomes. Zero hits for LEARNING_CANDIDATE /
    OUTCOME_OBSERVATION / MISSION_OUTCOME anywhere in the runtime. KnowledgePromoter
    handles only human snippet approvals.
14. BETTER NEXT MISSION: MISSING. Nothing consumes learnings; selection is static.
15. LOOP: broken at 13/14 — the loop does not close.

FIRST BROKEN STEP: INTENT → MISSION. There is no intent object and no structured mission
contract; the mission is a thin event wrapper, not the directive's mission. The
durable MISSION → EXECUTION → EVIDENCE → OUTCOME chain the directive prioritizes is
solid; the loop fails to open (no intent) and fails to close (no learning).

Operational symptom (from standing memory, not re-diagnosed here): 25 stuck
CLAIM_GENERATE missions with no consumer. The scheduler's claim/dispatch path for
CLAIM_GENERATE exists in code (map → 'claim' worker). Why those missions never
dispatched is a runtime-state question, not answerable from code archaeology; do not
treat code presence as runtime proof.

## DUPLICATE SYSTEMS AVOIDED (do not build; do not converge into the live path)

1. `ping-runtime/temporal/` (workflows/mission_workflow.js, activities) — DORMANT,
   zero requires from outside the directory. Do NOT adopt Temporal (directive forbids it).
2. `orchestration/execution/` stack — ExecutionEngine (716 lines), execution/scheduler.js
   (170), mission_compiler.js (210), consensus_engine.js, worker_state_machine.js,
   capability_registry.js, artifact_store/router, worker_port, ollama_provider — a PARALLEL
   dormant orchestration stack with its own scheduler. `orchestration/index.js`
   (ConstitutionalOrchestrator) wires it but has NO consumers; its main() is a self-report
   harness ("Phase 38"). Candidate for archival per the 12-step rule, not for convergence.
3. `orchestration/dispatcher.js` — repo self-analysis planner (entropy/ROI), NOT a mission
   dispatcher. Do not confuse with MissionScheduler.
4. Capability machinery: `connectors/capability_registry.js` (connector metadata),
   `orchestration/execution/capability_registry.js` (dormant stack),
   `runtime/capability_resolver.js` (CapabilityResolver, no live consumers). None on the
   hot path; do not build another.
5. Vendored/historical copies in ~/workspace (ce002, tenanos-wave, orca-finish,
   convergence-*, f01-fix, pig-transfer-tmp, .worktrees vendored copies) — probes,
   fixtures, harvest evidence. Not live authorities. Canonical = the Pig runtime.
6. Jev: the typed seam ALREADY EXISTS (typed_decision.js + shadow_worker.js). Do not
   build a new decision integration; harvest this one.
7. WorkerMemory: exists but file-based and unconsumed by the scheduler. Do not build a
   second worker-memory system.
8. Worktree scan (authority-overlap law): no competing MissionRuntime / MissionScheduler /
   WorkerRuntime / UnifiedEventRuntime / EvidenceAuthority class definitions in any
   sampled worktree. One vendored copy of UnifiedEventRuntime in
   `.worktrees/event-read-abstraction` (read-abstraction vendor copy, same class, not a
   competing authority). FYD worktrees were not read (off-limits lane).

## NEXT (smallest phase-2 wiring; no implementation in phase 1)

Smallest edge set that opens and closes the loop on EXISTING machinery:

1. Structured mission contract (opens the loop): document and validate the directive's
   mission fields (objective, subtasks, dependencies, verification requirements,
   completion criteria, capabilities, criticality, reversibility) on the mission payload
   at MissionRuntime.create. No new database; the payload is already JSONB.
2. Outcome observation (closes the result side): on mission completion/failure, emit a
   typed MISSION_OUTCOME event derived from the existing failure_record.js vocabulary.
   This is the VERIFICATION → OUTCOME OBSERVATION link; currently nothing emits it.
3. Learning candidate → promotion (closes the loop): a consumer of MISSION_OUTCOME that
   emits LEARNING_CANDIDATE events, promoted only through the feedback contract's
   learning gate (identity reduction, ≥10 independent tenants, materiality). This is the
   entire missing OUTCOME → LEARNING → BETTER NEXT MISSION chain.
4. Consult at selection: scheduler reads promoted learnings before falling back to the
   static MISSION_WORKER_MAP — empirical selection without replacing the map.
5. Wire the typed decision seam: scheduler issues DecisionRequests for worker-selection
   decisions with Jev recording in shadow mode (records only, never authority).
6. Enforce the existing approval authorities on the dispatch hot path for consequential
   actions (they exist but are not consulted).

Per Nolan's 2026-09-30 binding order, before any of this: prove ONE stuck mission
end-to-end on existing machinery (creation → claim → knowledge projection), mark the
exact first missing edge in runtime state, then drain a bounded subset.
