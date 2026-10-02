# SWARM-11 — Run/Attempt/Task State-Machine Map

**Scope:** TenantOS execution substrate only. FYD/HPP untouched. Survey date: 2026-09-23.
**Primary code:** `/home/nolan/ping` (Pig WSL) — the live gateway + ping-runtime substrate.
The wave repo `/home/nolan/projects/ping` (Next.js site) carries NO execution-substrate
state machines (verified by scan: no mission/worker/runtime states under `src/`, `scripts/`, `lib/`).
Wave work targets `src/tenanos/**` (greenfield at tag `tenanos-wave-base-20260923`).

Three live state machines found (plus two latent/adjacent). No second orchestrator
is being created: this map is a PROJECTION onto one required vocabulary, not a new runtime.

---

## M1 — Mission lifecycle (`ping_missions`, the DURABLE RUN record)

**Authority:** `MissionRuntime` — `/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js`
**Wiring:** `MissionScheduler` (`mission_scheduler.js`) is the sole dispatch path;
constructed in `gateway/bootstrap/gateway_runtime.js:476` (runtime), scheduler started at `:553-562`.

### Existing states and transitions (all SQL-guarded, conditional)

| Existing | Required | Notes |
|---|---|---|
| `created` | **PENDING** | `mission_runtime.js:33` (DDL default), `:68-94` (create). Claimable. |
| `retry_pending` | **PENDING** | `mission_runtime.js:202-239` (`failWithRetry`). Also PENDING (scheduled, not yet claimable). |
| `assigned` | **RUNNING** | `mission_runtime.js:106-121`. Claimed + 60s lease set atomically (`:108`). **Conflation:** claimed-but-not-started is RUNNING by the required vocabulary. |
| `running` | **RUNNING** | `mission_runtime.js:129-138`. |
| `completed` | **SUCCEEDED** | `mission_runtime.js:146-167`. |
| `failed` | **FAILED** | `mission_runtime.js:169-182`, `:215-222` (exhaustion). |
| *(none)* | **BLOCKED** | **MISSING.** No blocked/paused/held state anywhere in the runtime (`grep` for `blocked` hits only `integration_manager.js:53-54` policy-blocked integration results and merge-gate log lines — a different domain). |
| *(none)* | **CANCELLED** | **MISSING.** Zero `cancel` literals in mission_runtime.js, mission_scheduler.js, mission_execution_authority.js. A mission can never be withdrawn; the only exit from `created`/`retry_pending` is claim or failure-exhaustion. |
| *(none)* | **UNKNOWN_EXECUTION** | **MISSING — P0.** See R1 below. |
| *(none)* | **NEEDS_RECONCILIATION** | **MISSING — P0.** See R1 below. |

### Transition table (existing)

| From | To | Code | Guard |
|---|---|---|---|
| — | `created` | `mission_runtime.js:68-94` | `ON CONFLICT (mission_id) DO NOTHING`; idempotent by `sha256(missionType:event_id)` (`:71-76`) |
| `created` | `assigned` | `mission_runtime.js:106-121` | `WHERE status='created'` only; claim+`claimed_at`+`lease_until(+60s)` in one UPDATE (`:108`). Concurrent claim rejected (rowCount 0) — P0-1 fix |
| `assigned` | `running` | `mission_runtime.js:129-138` | `WHERE status='assigned'` only; silent no-op otherwise (no else branch) |
| `running` | `completed` | `mission_runtime.js:146-167` | `WHERE status='running'` only |
| `running`,`assigned`,`retry_pending` | `failed` | `mission_runtime.js:169-182` | direct fail |
| `running`,`assigned` | `retry_pending` | `mission_runtime.js:202-239` | backoff gate `retry_at`; exhaustion (`retries>=max_attempts`) → `failed` (`:215-222`) |
| `running`,`assigned` (+expired lease) | `created` | `mission_runtime.js:277-298` (`reapExpiredLeases`) | `lease_until < NOW()`, only when scheduler poll runs; emits `MISSION_LEASE_EXPIRED` |

### Scheduler behavior (mission_scheduler.js)

- `_poll` (`:145-187`): Arrow 0 renews leases for in-flight `_processing` set (`:153-161`);
  Arrow 1 reaps expired leases (`:163-172`); Arrow 2 dispatches up to `maxConcurrent=3` (`:174-186`).
- `_dispatch` (`:192-280`): `assign` → `start` → `WorkerRuntime.dispatch(event)` → on
  `status==='failed'` fail (`:258-259`), on null dispatch **skip + fail** (phantom-complete
  prevention, `:260-266`), on truthy-ok `complete` (`:267-273`). Dispatch throws → catch → `_failMission` (`:274-279`).
- `_failMission` (`:289-326`): `failWithRetry` → on exhaustion routes to `DeadLetterAuthority.recordDeadLetter` (`:298-321`, wired in bootstrap `:544-552`).

### Gaps at the mission layer

- **G1 — BLOCKED missing** (`mission_runtime.js` full-file review: no blocked/held/paused state).
- **G2 — CANCELLED missing** (no cancel path; missions are immortal until success/exhaustion).
- **G3 — MISSION_FAILED emitted for non-terminal retries** (`mission_runtime.js:234-236`):
  `failWithRetry` emits `MISSION_FAILED` even when the mission only moved to `retry_pending`
  (will be retried). Downstream consumers (Mission Control, projections) cannot distinguish
  "will retry" from "dead" except by re-reading the row — **conflation of FAILED with PENDING**.
- **G4 — Stale comment vs code** (`mission_runtime.js:191-194`): the `failWithRetry` docstring
  claims `reapExpiredLeases()` picks up `retry_pending` rows when `retry_at` passes, and
  references a `reclaimRetryPending()` method that **does not exist anywhere in the codebase**
  (verified: only hit is the comment itself). The reaper's SQL (`:277-285`) matches only
  `('running','assigned')`. The retry path works via `getPending` (`:306-315`), but the
  comment is wrong and the phantom method name is a trap for future readers.
- **G5 — retry_pending retains stale lease** (`mission_runtime.js:227-228`): the retry UPDATE
  does not clear `lease_until`/`claimed_at`. Harmless today (reaper ignores `retry_pending`,
  `renewLease` `:254-264` matches only `running`/`assigned`), but a stale lease timestamp on a
  pending row is a latent misread for any future reconciler.
- **G6 — No per-attempt records.** `retries` is an integer counter (`:43`); attempt history
  (which attempt ran when, on which worker, with what evidence) is not durable. Two retries
  are indistinguishable in the record.

---

## M2 — Worker execution (`WorkerRuntime`, in-memory; NOT durable)

**File:** `/home/nolan/ping/ping-runtime/workers/worker_runtime.js`

| Existing | Required | Notes |
|---|---|---|
| `idle` | (worker health, not run state) | `worker_runtime.js:44` |
| `processing` | RUNNING (worker-side) | `:82`, `:99` |
| `stale` | health signal | `:133-137`: `lastHeartbeat` older than 60s → reported `stale`; **not persisted** |

- Dispatch is the single path (`:69-113`); a dormant worker with no matching eventTypes
  silently no-ops (fixed by scheduler-side null-check, M1).
- Worker liveness is **purely in-memory**; a gateway restart loses all worker state.
  Staleness is derived, never recorded. There is no durable "worker disappeared" record —
  the mission layer only sees the lease expire (see **R1**).

---

## M3 — Phase-15 coding-loop execution record (`mission_executions`, gateway)

**Files:** `/home/nolan/ping/gateway/mission_execution_authority.js`,
`/home/nolan/ping/gateway/repositories/execution_repository.js`

| Existing | Required | Notes |
|---|---|---|
| `pending` (default) | PENDING | `mission_execution_authority.js:63`; `execution_repository.js:30` |
| `completed` | SUCCEEDED | written **only at the end** of `executeMission` (`mission_execution_authority.js:157-160`) |
| *(no running)* | RUNNING | **MISSING — P0.** `executeMission` (`:88-186`) never INSERTs a start record; a crash anywhere in steps 1-12 leaves **no row at all**. The `pending` default is dead in the main path. |
| *(no failed)* | FAILED | **MISSING.** A throw mid-loop propagates with no status write. |

- `approval_status`: `approved`/`rejected` (`gateway/approval_authority.js:220,236`) — belongs to the
  human-decision layer (swarm 10), adjacent to BLOCKED but not a run state.
- **Latent bug (flag, not in scope to fix):** `ExecutionRepository.complete` (`execution_repository.js:96-104`)
  writes `execution_result`, but the `mission_executions` DDL (`mission_execution_authority.js:60-75`)
  has **no `execution_result` column** — `complete()` fails on a fresh table. Evidence of an
  untested path; the main path never calls it.

---

## M4 — Temporal workflow (latent / alternate path)

**Files:** `/home/nolan/ping/ping-runtime/temporal/workflows/mission_workflow.js`,
`temporal/activities/mission_activities.js`, `temporal/index.js`

- Approval states: `none/pending/approved/rejected/expired` (`mission_workflow.js:48`);
  workflow status: `completed`/`failed` (`:79,108,115`).
- Header comment: "PING owns business state (missions, events, evidence)"; "MissionRuntime owns mission state"
  (`mission_activities.js:62`). **Not wired into the live bootstrap dispatch path** (no temporal
  references in `gateway_runtime.js` scheduler wiring). Treated as LATENT — do not build on it,
  do not fork it. If activated later it must project onto the same required vocabulary (this map).

---

## M5 — Adjacent (NOT the run loop; do not conflate)

- `proposal_admission.js:127,139` — `accepted`/`rejected`: proposal quarantine domain.
- `integration_manager.js:53-54` — `blocked` (policy): integration results, not runs.
- Merge-gate `BLOCKED` log lines (`merge_gate.js:186`, `orchestration/execution/engine.js:567,698`): CI-style gates, not run states.

---

## R1 — P0 FINDING: the lease reaper silently folds UNKNOWN_EXECUTION into PENDING

`reapExpiredLeases` (`mission_runtime.js:277-298`) resets any `running`/`assigned` row whose
60s lease expired back to `created`, emitting only `MISSION_LEASE_EXPIRED`.

**Why this is wrong (hard rules from the charter):**

1. **"Worker disappeared" is NOT FAILED** — respected today (no `failed` write). Good.
2. **But it is also NOT "never started".** A mission reclaimed to `created` is re-dispatched
   from scratch. If the dead worker had already produced a side effect (connector send,
   projection write, external API call) before dying, the retry **repeats a proven effect**.
   "Timeout is NOT proof the effect did not happen" — the reaper treats lease-expiry as proof
   of non-execution.
3. The `assigned → running` split makes it worse: a crash between `assign` and `start`
   (inside `MissionScheduler._dispatch`, `mission_scheduler.js:210-216`) leaves `assigned`
   with a live lease; after 60s the reaper returns it to `created` — correct here (no work
   began). But a crash between `dispatch(event)` return and `complete()` (`mission_scheduler.js:250-273`)
   leaves `running`; the worker **did the work**, the result is lost, the reaper re-queues —
   effect repeats with no trace that attempt #1 happened (see G6: no per-attempt records).

**Required states to add:** `UNKNOWN_EXECUTION` (effect state indeterminate) and
`NEEDS_RECONCILIATION` (replacement must classify before re-dispatch). The reconciler must
answer, from durable evidence (ping_events chain + effect idempotency keys), one of:
**completed-effect** → mark SUCCEEDED without re-execution; **no-effect** → PENDING (safe re-dispatch);
**indeterminate** → BLOCKED/held for human or compensating action, never silently re-queued.

## R2 — P0-adjacent: crash windows with no recovery on the mission path

- (a) `assign` ok → process dies before `start` (`mission_scheduler.js:212-215`): row stays
  `assigned`; healed only by lease reaper (60s+). No startup scan: `gateway_runtime.js` bootstrap
  performs **no reconciliation of `ping_missions`** (verified: no `reap`/reconcile/orphan references
  in `gateway_runtime.js`; recovery depends entirely on the scheduler poll loop staying alive).
- (b) `complete()` DB write ok → process dies before `MISSION_COMPLETED` emit
  (`mission_runtime.js:159-166`): mission SUCCEEDED, downstream event never fires.
  Mission Control (event-driven) disagrees with the DB.
- (c) Event→mission derivation gap (proven separately in `~/workspace/lane-c-event-mission-recovery-gap.md`):
  orphaned canonical events never become missions. **Not duplicated here** — consumed as input;
  lane C's proposed reconciler is the mission-input counterpart to this document's run-level reconciler.
- (d) Phase-15 `executeMission` crash (M3): no row at all; the attempt is invisible.

## Required-state coverage summary

| Required | M1 (mission) | M2 (worker) | M3 (executions) | M4 (temporal) |
|---|---|---|---|---|
| PENDING | `created`, `retry_pending` | — | `pending` (dead default) | — |
| RUNNING | `assigned`, `running` (conflated) | `processing` (in-mem) | **missing** | implicit |
| SUCCEEDED | `completed` | — | `completed` | `completed` |
| FAILED | `failed` | — | **missing** | `failed` |
| BLOCKED | **missing** | — | — | — |
| CANCELLED | **missing** | — | — | — |
| UNKNOWN_EXECUTION | **missing (R1)** | — | — | — |
| NEEDS_RECONCILIATION | **missing (R1)** | — | — | — |

**Missing or conflated:** BLOCKED, CANCELLED, UNKNOWN_EXECUTION, NEEDS_RECONCILIATION missing
everywhere; RUNNING conflates claimed-not-started (`assigned`) with executing (`running`);
FAILED conflated with will-retry (G3); per-attempt history absent (G6); durable RUNNING/FAILED
absent on the phase-15 path (M3).

## Boundary notes (other swarms — do not duplicate)

- **Swarm 03 (MCP/tool plane):** effect idempotency at the connector/tool level is theirs.
  This document's reconciler consumes idempotency evidence; it does not re-implement it.
- **Swarm 09 (task claiming):** the `assign` claim protocol (P0-1) is existing machinery;
  proposals here extend, never fork, it.
- **Swarm 10 (human decision budget):** BLOCKED-on-approval semantics coordinate with theirs;
  approval states (`approved`/`rejected`) stay in the approval authority.
- **Swarm 17 (resource governance):** bounds (`maxConcurrent=3`, 60s lease, `max_attempts=3`,
  5s backoff) are existing; no new quota system here.
- **Constitutional sprint:** owns transition/replay authority *mapping*; this document consumes
  its findings. The run-state vocabulary/projection module proposed in the diffs is the
  single ownership point for execution/run-state semantics (memory 2026-09-13: "Execution/run
  state" is one of the 12 provable-single-ownership areas) — it maps, it does not fork,
  MissionRuntime/WorkerRuntime.
