# ENGINE INVENTORY — TenantOS Mission Execution Substrate (SWARM 02)

**Audited:** 2026-09-23 ~19:00 MDT, read-only against live Pig checkouts.
**Scope correction (falsified task premise):** the wave repo `/home/nolan/projects/ping`
(the Next.js FYD site) contains **zero** mission-engine primitives — `grep ping_missions`
returns nothing; the only "MissionRuntime" hits are `src/fyd/identity/*.ts` using the
word in an unrelated sense. The entire execution substrate lives in the sibling
checkout **`/home/nolan/ping`** (CRX runtime, git HEAD `cc6856c3b`). Every file:line
below is `/home/nolan/ping`-relative unless stated otherwise. Nothing was modified.

**Production loop (verified wired):** `gateway/bootstrap/gateway_runtime.js:476-580`
constructs `UnifiedEventRuntime → MissionRuntime → WorkerRuntime (+8 canonical workers)
→ MissionScheduler (+DeadLetterAuthority) → EventToMissionBridge` and starts them.
The live loop is:

```
TENANT INTENT (business emitters via Canonicalization Service, gateway_runtime.js:567)
  → EVENT (UnifiedEventRuntime.emit → ping_events)
  → MISSION (EventToMissionBridge → MissionRuntime.create)
  → DURABLE RUN (ping_missions row; per-ATTEMPT identity ABSENT — gap G-01)
  → BOUNDED WORK (MissionScheduler poll 5s, maxConcurrent=3, 60s leases)
  → CAPABILITY DECISION (WorkerRuntime.dispatch: eventTypes match)
  → TOOL EXECUTION (canonical worker handle())
  → RESULT (MissionRuntime.complete/fail/failWithRetry)
  → VERIFICATION (kernel replay provider, EvidenceAuthority)
  → EVENT/EVIDENCE (MISSION_* events → ping_events; getTrace correlation bundles)
  → MEMORY (knowledge graph projection, gateway_runtime.js:583+)
  → MISSION CONTROL → NEXT WORK (worker output events re-enter the bridge;
     the OBSERVATION→CLAIM→CLASSIFICATION→RECOMMENDATION→PROJECTION→REPLAY→
     WITNESS→LINEAGE chain is a DAG-by-convention, not data — gap G-04)
```

## 1. KEEP — proven primitives (do not duplicate)

### 1a. UnifiedEventRuntime — the single event writer
- `ping-runtime/events/unified_event_runtime.js:21` — `class UnifiedEventRuntime`
- `initialize()` :41 — DDL `ping_events(event_id PK, event_type, source, timestamp,
  payload JSONB, metadata JSONB, namespace, processed, created_at)` + 7 indexes
  incl. expression indexes on `metadata->>'causation_id'` / `correlation_id`
- `emit()` :73 — the one-writer path:
  - deterministic `event_id = sha256({eventType, source, [namespace], [logical_id|payload]})` (:76-82)
  - event-type validation + governance gate (:84-114)
  - fail-closed without pool (:147-151)
  - `INSERT … ON CONFLICT (event_id) DO NOTHING` + **semantic-collision detection**
    (:153-186): same ID + different payload ⇒ `error`, not silent dedup
  - in-process handler dispatch (:188-196), integration routing (:198-204)
- Lineage queries: `getChildren` :264, `getDescendants` :285, `getAncestors` :317,
  `getCorrelationGroup` :348
- **Verdict: KEEP.** The canonical journal. No second writer may exist.

### 1b. MissionRuntime — durable mission identity + conditional transitions
- `ping-runtime/orchestration/mission_runtime.js:12` — `class MissionRuntime`
- `initialize()` :27 — DDL `ping_missions(mission_id PK, mission_type, status,
  priority, payload JSONB, result JSONB, assigned_to, created_by, created_at,
  started_at, completed_at, error, retries, retry_at, lease_until, claimed_at)`
- `create()` :68 — **deterministic mission_id** `= sha256(missionType:event_id|payload)[0:16]`;
  `ON CONFLICT DO NOTHING` ⇒ idempotent by construction; emits `MISSION_CREATED`
- `assign()` :106 — atomic claim: single `UPDATE … WHERE status='created'`,
  sets `assigned_to/claimed_at/lease_until=+60s`; `rowCount 0` = lost race
- `start()` :129 — `assigned→running` conditional
- `complete()` :146 — `running→completed` conditional; records `result+duration_ms`;
  emits `MISSION_COMPLETED` **after** the row update (see gap G-03)
- `fail()` :172 — `→failed` from running/assigned/retry_pending
- `failWithRetry()` :202 — P0-4: increments `retries`, `→retry_pending` with
  `retry_at` backoff gate; exhaustion (`retries ≥ max_attempts`) `→failed`
- `renewLease()` :254 — extends lease iff status in (running, assigned)
- `reapExpiredLeases()` :277 — P0-6: expired `running/assigned →created`,
  clears claim state, emits `MISSION_LEASE_EXPIRED` per mission
- `getPending()` :306 — priority-ordered; includes due `retry_pending`
- `getTrace()` :352 — evidence bundle: mission row + full correlation group
  resolved via triggering event's `correlation_id`
- **Verdict: KEEP.** Mission-level durability is proven. It lacks only the
  attempt layer beneath it (G-01), which is additive, not a replacement.

### 1c. MissionScheduler — poll loop, lease arrows, bounded dispatch
- `ping-runtime/orchestration/mission_scheduler.js:82` — `class MissionScheduler`
- `_poll()` :145 — **Arrow 0**: renew leases for `_processing` set;
  **Arrow 1**: `reapExpiredLeases()`; **Arrow 2**: dispatch up to `maxConcurrent`
- `_dispatch()` :192 — `assign → start → build event → WorkerRuntime.dispatch(event)`;
  **uses dispatchResult** (P0-2/P0-3): `status:'failed'` → fail; null → fail as
  no-match (phantom-complete prevention); else `complete()`
- `_failMission()` :289 — P0-4/P0-5: `failWithRetry` → exhaustion → `DeadLetterAuthority`
- `MISSION_WORKER_MAP` :41 — labeling/assignment metadata only (doc-contract :34-40);
  the single execution decider is `WorkerRuntime.dispatch`
- **Verdict: KEEP.** Gaps: no dispatch timeout (G-02), no attempt record (G-01).

### 1d. WorkerRuntime — canonical worker dispatch
- `ping-runtime/workers/worker_runtime.js:14` — `class WorkerRuntime`
- `register()` :30 — requires `handle(event)`; `{eventTypes, capabilities, maxConcurrent}`
- `dispatch()` :69 — matches `eventTypes`, enforces `maxConcurrent`, propagates
  worker exceptions to caller (P0-2); returns last worker's result
- `_poll()` :147 — **disabled by design** (dispatch-only mode, :60-64)
- **Verdict: KEEP.** Workers are canonical and authority-bearing (cf. ORCA A6 REJECT).

### 1e. BaseWorker + 8 canonical workers
- `ping-runtime/workers/canonical_workers.js:20` — `class BaseWorker`
- `_emit()` :31 — **fail-closed emit**: throws if `EventRuntime` missing or emit
  returns non-ok; preserves `namespace` (privacy boundary), `correlation_id`,
  `causation_id` (= triggering event id), confidence inheritance
- Workers: observation, claim, classification, recommendation, projection,
  replay (kernel-verified), witness, lineage — each `handle()` returns
  `{status:'ok'|'failed', …}`; chain via `EVENT_MISSION_MAP`
  (`ping-runtime/orchestration/event_to_mission_bridge.js:27-70`)
- **Verdict: KEEP.**

### 1f. EventToMissionBridge — intent → mission
- `ping-runtime/orchestration/event_to_mission_bridge.js:72`
- `EVENT_MISSION_MAP` :27 — 30 business/worker event types → mission types + priority
- `_handleEvent()` :106 — threads `correlation_id`, creates mission idempotently
- **Verdict: KEEP.** This is the mission-creation ingress; the worker-output
  chain (OBSERVATION_CREATED → … → LINEAGE_CREATED terminal) is the de-facto DAG.

### 1g. EventBridge cursors — the only checkpoint analog
- `ping-runtime/events/event_bridge.js:20` — `class EventBridge`
- `ping_bridge_cursors(source PK, last_event_id, updated_at)` (:52-56);
  restore on init (:60-76), upsert on progress (:213-218)
- **Verdict: KEEP + PROPAGATE** the pattern: consumer-offset checkpointing is the
  shape attempt checkpoints should copy. No attempt-level checkpoint exists (G-05).

### 1h. DeadLetterAuthority — exhaustion sink
- `gateway/dead_letter_authority.js:56` — DDL `repository_dead_letters(...)`;
  `recordDeadLetter()` :112; now injected into scheduler (gateway_runtime.js:544-556;
  previously unreachable — fixed)
- **Verdict: KEEP.**

## 2. REFACTOR — real code, wrong durability/wiring (eligible wave work)

### 2a. EffectAuthority — effect ledger exists but is unwired and in-memory
- `ping-runtime/approval/effect_authority.js:1` — `class EffectAuthority`
- `generateEffectId()` :16 — deterministic `effect_` + canonical hash of
  `(event_type, aggregate_id, action_type)` — the right idempotency-key shape
- `createEffect()` :28, `markExecuting()` :75, `markSucceeded()` :93,
  `markFailed()` :111, `isEffectCompleted()` :70
- **Defects (both documented in-repo):**
  1. **Unwired:** zero `require()` of it outside `ping-runtime/approval/`
     (verified 2026-09-23). No execution path consults it before retry.
  2. **In-memory by default:** `this._effects = {}` when no storage adapter;
     `ping-runtime/approval/approval_restart_durability.test.js:1-12` explicitly
     records this as a **known defect**: "state is lost on process restart…
     After fixing to use PostgresAdapter, these should pass."
- **Verdict: REFACTOR** → durable PG-backed effect ledger + wire into the
  retry path (proposal P-20260923-005). This is the highest-value closeable gap:
  it is the missing half of UNKNOWN_EXECUTION reconciliation.

### 2b. `complete()` emit ordering — G-03
- `mission_runtime.js:146-170`: row transitions to `completed` **before**
  `MISSION_COMPLETED` is emitted. If emit throws/rejects, the row is terminal
  but Mission Control (event-driven) never sees the completion; the scheduler's
  catch then calls `failWithRetry`, whose conditional UPDATE matches 0 rows —
  silent divergence between row truth and journal truth.
- **Verdict: REFACTOR** (emit-before-transition, or a reconciler that heals
  completed-without-event). Covered by proposal P-20260923-005 reconciler.

## 3. INVENTION-REQUIRED — gaps with no live analog (proposals below)

- **G-01 durable attempt identity:** no `ping_mission_attempts`, no attempt row;
  `retries` counts failures, not claims (memory 2026-09-18 note §"attempt model"
  still accurate for live code); `claimed_at/started_at` overwritten per claim.
  Two physical executions of one mission are indistinguishable. → P-20260923-003
- **G-02 hung dispatch:** `_dispatch()` awaits `WorkerRuntime.dispatch(event)`
  with **no timeout** (`mission_scheduler.js:231`); Arrow 0 renews the lease of
  anything in `_processing` forever ⇒ the reaper can never reclaim a hung
  worker; one hung dispatch stalls its poll iteration. The archaeology's claimed
  `_dispatchWithTimeout` (O5) does **not** exist in live code — falsified.
  → P-20260923-004
- **G-04 task DAG:** no `depends_on` edges, no ready-set query, no cycle
  rejection; ordering exists only as bridge-map convention. → P-20260923-006
- **G-05 attempt checkpoints:** zero `checkpoint` matches in ping-runtime;
  only bridge cursors (1g) exist as a pattern. → folded into P-20260923-003
- **G-06 startup reconciliation:** no `reconcileLostCompletions`, no attempt
  fencing (`getFencingToken`/`STALE_ATTEMPT` were ce002-experiment-only, not
  live — falsified as live claims). → folded into P-20260923-005

## 4. DROP — competing/dormant mechanisms (do not propagate)

- **Temporal `mission_workflow.js`** (`ping-runtime/temporal/workflows/`): a full
  second execution path (durable workflow, approval signals, activities) —
  referenced only by its own `index.js` + test. Dormant second orchestrator.
  **Verdict: DROP** (keep file as-is; never wire). Per absolute constraint
  "NO second orchestrator".
- **`ping-runtime/orchestration/execution/{scheduler,event_queue,worker_state_machine}.js`:**
  `Scheduler`, `EventQueue`, `WorkerStateMachine` classes with zero production
  importers (only doc-generator references). Dormant. **Verdict: DROP.**
- **`ping-runtime/orchestration/dispatcher.js` + `worker_registry.js`:**
  legacy analysis/planning tooling (entropy batches, persona prompts), not the
  live dispatch path. **Verdict: DROP** from the engine story (out of lane).
- **`reclaimRetryPending()`:** referenced only in a comment
  (`mission_runtime.js:192`); `getPending()` already covers due retries.
  **Verdict: DROP** the reference (doc drift), not a mechanism.

## 5. Falsified prior claims (corrections to the record)

- **"worker dispatchResult discarded by scheduler"** (memory 2026-09-18): FALSE
  for live code — `mission_scheduler.js:233-252` branches on `dispatchResult`
  (P0-2/P0-3). The note described a pre-P0 state.
- **"`_dispatchWithTimeout` hung-worker watchdog (O5)"** (ORCA-ARCHAEOLOGY §2.7):
  not present in live `mission_scheduler.js` — the dispatch is unbounded.
- **"Lane J completion-requires-emission"** (ORCA-ARCHAEOLOGY §2.7): no such
  ordering in live `complete()` — update precedes emit.
- **"ce002 attempt fencing live"**: `getFencingToken`/`attempts=$3` absent from
  live `mission_runtime.js` — experiment-only.
- **Task premise "repo = /home/nolan/projects/ping"**: the substrate is in
  `/home/nolan/ping`; the wave repo has no mission primitives (verified by grep).

## 6. Durable tables (complete, from code DDL)

| Table | Owner | File:line |
|---|---|---|
| `ping_events` | UnifiedEventRuntime | `ping-runtime/events/unified_event_runtime.js:44` |
| `ping_missions` | MissionRuntime | `ping-runtime/orchestration/mission_runtime.js:30` |
| `ping_bridge_cursors` | EventBridge | `ping-runtime/events/event_bridge.js:52` |
| `repository_dead_letters` | DeadLetterAuthority | `gateway/dead_letter_authority.js:56` |
| `customers`, `knowledge_nodes`, `knowledge_edges`, `review_flags` | domain | various (not engine) |

No `ping_mission_attempts`, no `ping_attempt_checkpoints`, no `ping_effect_ledger`,
no `ping_mission_dependencies` exist. Those four are exactly the proposal set.
