# Recursive Delegation Archaeology — MissionScheduler → WorkerRuntime

Date: 2026-10-01. READ-ONLY. No build, launch, restart, patch, commit, wiring, or state mutation performed. Evidence only.

Question: can the EXISTING MissionScheduler → WorkerRuntime express
ROOT MISSION → BOUNDED CHILD MISSIONS → HETEROGENEOUS WORKERS → RESULTS/EVIDENCE → DETERMINISTIC AGGREGATION?

Short answer: NO. The chain breaks at the first delegation edge.

## Exact first missing edge

**No child-mission concept exists.** There is no `parent_mission_id` (or `root_mission_id`) anywhere in the schema, no API for creating a mission as a child of another mission, and no delegation record. A worker cannot create a bounded child mission of its own mission. The only follow-on creation path (worker emits event → EventToMissionBridge → `MissionRuntime.create`) produces a *new rootless mission* linked only by event-level `correlation_id`/`causation_id`, with no mission-level parent pointer, no depth accounting, and no authority attenuation. Every downstream requirement (bounds on depth/fan-out/total executions, monotonic attenuation, deterministic aggregation of child results) is consequently ABSENT — there is nothing to bound, attenuate, or aggregate.

## Estate searched

Searched `~/workspace` including all 20 worktrees under `~/workspace/.worktrees` (none contain scheduler/runtime implementations), excluding `node_modules`, venvs, and `self_improvement` memory snapshots. Semantic families covered: scheduler/dispatch/poll, worker/runtime/handle, mission/create/claim, delegate/spawn/propose/child/parent, capability/authority, budget/deadline/retry/cancel, aggregat/fan-in/reduce, lineage/replay/provenance.

Canonical implementation read (freshest local copies of the live Pig path `MissionRuntime → MissionScheduler → WorkerRuntime` over `UnifiedEventRuntime`, Postgres `ping_missions` + `ping_events`):

- `~/workspace/f01-fix/mission_scheduler.js` (739 lines; HOLD invariant + F-01 retry repair)
- `~/workspace/f01-fix/mission_runtime.js` (schema + lifecycle)
- `~/workspace/sprint-2026-09-24/orca/wr-effect-unknown/patch/worker_runtime.js` (fail-closed dispatch receipt)
- `~/workspace/fyd-lane/harvest-wave1/code-evidence/event_to_mission_bridge.js` (bridge)
- `~/workspace/fyd-lane/harvest-wave1/code-evidence/unified_event_runtime.js` (event choke point)
- `~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/workers/canonical_workers.js` (BaseWorker._emit lineage threading)

Older/archival copies (not live authorities): `pig-transfer-tmp/`, `ce002/src/`, the 2026-09-19 `pig-src` snapshot, `constitutional-sprint/.../obs1-scratch/`. The runtime docblock states "Single canonical mission system… Replaces 12 dead mission implementations."

## Property inventory

| Property | Verdict | Evidence |
|---|---|---|
| mission ID | EXISTS | `ping_missions.mission_id VARCHAR(255) PRIMARY KEY`. Deterministic: `sha256(missionType:event_id)` sliced to 16 hex, else `sha256(missionType:canonical_payload)`; `ON CONFLICT DO NOTHING` — idempotent by construction (`mission_runtime.js:114-130`). |
| parent mission ID | ABSENT | No `parent_mission_id` column; no occurrence of parent/child/delegate/spawn/propose in scheduler or runtime. |
| root mission ID | ABSENT | No root concept. `correlation_id` threads the *originating event* through the chain (bridge + `BaseWorker._emit`), but it identifies an event group, not a root mission. |
| run ID | ABSENT | No run concept. `created_by` records creator provenance (`'event-to-mission-bridge'` or caller-supplied); scheduler stats are `scope: 'session'` in-memory only. |
| execution ID | ABSENT | No per-attempt record. Attempts are implied by `retries` counter + `effect_count` + lease timestamps. `logical_operation_id` (= `mission_id` at creation, never reminted) is the stable *logical operation* identity across HOLD/restarts/re-attempts — retry idempotency, not execution identity. |
| child creation path | PARTIAL (pipeline only, not delegation) | The only follow-on path: worker `handle()` → `_emit(eventType, …)` → `UnifiedEventRuntime` → `EventToMissionBridge._handleEvent` → `MissionRuntime.create(missionType, {event_id, event_type, correlation_id, …})`. It creates a *new rootless mission*; the bridge performs no parent attribution and no authority check on the emitter (see Authority). This is a fixed pipeline (OBSERVATION_CREATED→CLAIM_GENERATE→…→LINEAGE_CREATE terminal), not worker-directed delegation. |
| worker selection | PARTIAL | Registration: `register(name, worker, {eventTypes, maxConcurrent, capabilities})`. Canonical decider is `WorkerRuntime.dispatch()`: a worker runs iff `eventTypes.length > 0 && eventTypes.includes(eventType)`. `MISSION_WORKER_MAP` is labeling/assignment metadata only per its own `[DOC-CONTRACT]`; scheduler additionally guards on registration. Gaps: (a) `capabilities` are stored and reported in `getStats()` but **never consulted at dispatch**; (b) dispatch invokes **every** capacity-available worker whose `eventTypes` match and keeps only the last result (`lastResult` overwrite) — no exactly-one-worker guarantee in code. |
| authority/capability attachment | PARTIAL (declared, unenforced) | Per-worker `capabilities[]` declared at registration, unenforced. No per-mission authority attachment; no VALIDATE / ATTENUATE / MINT-AUTHORIZE / RECORD / DISPATCH sequence anywhere. The bridge mints missions from any emitter's events with no source authorization check (see Authority). |
| budget | PARTIAL (per-mission mechanics only) | `dispatchTimeoutMs` (default 120s), `stuckThresholdMs` (default 600s → HOLD), `maxConcurrent` (default 3), `retryPolicy.max_attempts` (default 3), 60s claim lease with renewal. No token/cost/resource budget, no per-tree budget, no per-mission deadline column. |
| deadline | PARTIAL | Only as timeouts: dispatch timeout → UNKNOWN/HOLD; stuck threshold → HOLD. No deadline field, no downward-propagated deadline (nothing to propagate to). |
| depth | ABSENT | No depth field, no `MAX_DEPTH`, no depth accounting. |
| fan-out | ABSENT | No fan-out bound; the bridge creates at most one mission per event by natural key, but a worker may emit arbitrarily many distinct events. |
| cancellation | ABSENT | No cancel API in scheduler or runtime. The word appears once, in a comment: "Detection + parking only — no retry, no cancel". Stuck/unknown outcomes PARK as HOLD; HOLD exits only via `reconcileHold()` evidence decisions (`succeeded`/`failed`/`safe_to_retry`/`hold`). Cancellation does not propagate downward — there is no downward. |
| retry | EXISTS | Proven-failure-only retry: `_failMission` accepts only `dispatchOutcome ∈ {worker_failed, no_worker}` (TypeError otherwise); `failWithRetry` with backoff-gated `reclaimRetryPending`; retries reuse the same row (never reminted `logical_operation
...[truncated 6642 chars]