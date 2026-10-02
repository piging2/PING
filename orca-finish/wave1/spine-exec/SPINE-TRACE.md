# SPINE-TRACE: The Real Current Execution Path

Repo: `/home/nolan/ping` | Branch: `refactor/runtime-authority-convergence` | Commit: `cc6856c3bc78e0535e66f168c66dc31abee2c073`
Inspection date: 2026-09-23. READ-ONLY inspection; nothing modified.

Boot entry: `gateway/server.js` requires `./bootstrap/gateway_runtime`; `GatewayRuntime.initialize()` wires everything below.
All line numbers below are from that commit.

---

## 1. End-to-end traced path (the live spine)

### Step 0: Boot wiring (gateway/bootstrap/gateway_runtime.js)

`GatewayRuntime.initialize()` builds the spine in this order:

| Line | What |
|---|---|
| 339-344 | `executionEngine = new ExecutionEngine(); await executionEngine.initialize({ discoverOllama: false })` (Orca parallel engine, see section 8) |
| 433-439 | `unifiedEventRuntime = new UnifiedEventRuntime({pool, eventValidator, eventGovernance, integrationManager})` + `initialize()` |
| ~440-460 | `CanonicalizationService` wraps the event runtime; business emitters route through it |
| ~465-470 | `eventBridge = new EventBridge({pool, eventRuntime, pollIntervalMs: 5000, batchSize: 50})`; `eventBridge.start()` |
| 476-478 | `missionRuntime = new MissionRuntime({pool, eventRuntime})` + `initialize()` |
| 480 | `workerRuntime = new WorkerRuntime({pool})` |
| 514-523 | `registerCanonicalWorkers(workerRuntime, {...})` with `replayProvider = new KernelReplayExecutionProvider()` |
| 545-552 | `deadLetterAuthority = new DeadLetterAuthority(this._pool)` + `initialize()` (comment notes the DLQ path was previously unreachable and is now injected) |
| 553-561 | `missionScheduler = new MissionScheduler({missionRuntime, workerRuntime, eventRuntime, deadLetterAuthority, pollIntervalMs: 5000, maxConcurrent: 3})`; `missionScheduler.start()` |
| 576-580 | `eventToMissionBridge = new EventToMissionBridge({eventRuntime, missionRuntime})`; `eventToMissionBridge.start()` |
| 792-793 | `this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine))` |

### Step 1: Event acceptance. UnifiedEventRuntime.emit()

File: `ping-runtime/events/unified_event_runtime.js:83`

Caller: `EventBridge` poll loop (feeds `repository_events` + `canonical_events` tables into `ping_events`), business emitters via `CanonicalizationService`, and any direct emitter.

Callee chain inside emit:
1. Deterministic `event_id = sha256(JSON of {eventType, source, [namespace], [logical_id|payload]})`.
2. `eventValidator.validateEventType(eventType)`; on invalid: `{status:'error'}`, stats.failed++.
3. `eventGovernance.validateEvent(...)`; on violation: `{status:'error'}`.
4. Canonical event built; namespace defaults to `core::system` (single owner of the default).
5. **Fail-closed persistence**: no pool = error. `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING`. On conflict, compares canonical JSON of payloads; semantic mismatch = "Event ID collision" error (fail closed).
6. Dispatch to in-memory `this._handlers` subscribers (per event type). Handler exceptions are caught and logged, never propagated.
7. Route to `integrationManager`.

State written: one row in `ping_events`. Side effect: handler callbacks fire (this is how the bridge receives events). Failure path: validation/governance/persist failures return error status; event never exists.

### Step 2: Event to mission. EventToMissionBridge._handleEvent()

File: `ping-runtime/orchestration/event_to_mission_bridge.js:93`

Caller: registered as a handler on `UnifiedEventRuntime` for each of the 30 event types in `EVENT_MISSION_MAP` (bridge `start()`, line 78).

Callee: `MissionRuntime.create(missionType, context, {priority: canonicalPriority(p), createdBy: 'event-to-mission-bridge'})` (line 116). Context carries `event_id, event_type, source, namespace, correlation_id, canonical_hash, confidence, payload`.

Failure path: try/catch around create; on error logs and `stats.failed++`. **The event is already persisted; the mission is silently lost.** No retry of mission creation. (Gap, see GAPS.md.)

Note: bridge does NOT modify state, only creates missions (header comment).

### Step 3: Mission authority. MissionRuntime

File: `ping-runtime/orchestration/mission_runtime.js`

| Method | Caller | What it does | State written | Event emitted |
|---|---|---|---|---|
| `create(missionType, payload, options)` :79 | EventToMissionBridge | `mission_id = sha256(missionType:event_id or payload)[:16]`; `INSERT INTO ping_missions ... ON CONFLICT DO NOTHING` | `ping_missions` row, status `created` | `MISSION_CREATED` |
| `assign(missionId, workerName)` :112 | MissionScheduler._dispatch | Conditional `UPDATE ... SET status='assigned', lease_until=NOW()+60s WHERE status='created'` (claim-proof: concurrent claim gets rowCount 0) | lease fields | `MISSION_ASSIGNED` |
| `start(missionId)` :137 | MissionScheduler._dispatch | Conditional `assigned -> running` | `started_at` | `MISSION_STARTED` |
| `complete(missionId, result)` :153 | MissionScheduler._dispatch | Conditional `running -> completed`; `result = JSONB({...result, duration_ms})`, `completed_at` | **`ping_missions.result`** | `MISSION_COMPLETED` |
| `fail(missionId, error)` :180 | (unused by scheduler; scheduler uses failWithRetry) | `running/assigned/retry_pending -> failed` | `error`, `completed_at` | `MISSION_FAILED` |
| `failWithRetry(missionId, error, {max_attempts=3, backoff_delay_ms=5000})` :207 | MissionScheduler._failMission | SELECT retries; next >= max -> `failed`; else `retry_pending` + `retry_at = now + backoffMs` | `retries`, `retry_at` | `MISSION_FAILED` (both paths) |
| `renewLease(missionId, 60)` :263 | MissionScheduler._poll Arrow 0 | Extends `lease_until` for running/assigned with non-null lease | `lease_until` | none |
| `reapExpiredLeases()` :288 | MissionScheduler._poll Arrow 1 | `running/assigned` with `lease_until < NOW()` -> `created`, clears assignment/lease/claimed, sets `retry_at=NOW()` | status reset | `MISSION_LEASE_EXPIRED` per mission |
| `getPending(limit)` :317 | MissionScheduler._poll Arrow 2 | `status='created' OR (retry_pending AND retry_at <= NOW())`, ORDER BY priority DESC, created_at ASC | read | none |

Backoff note: despite the name, the delay is a FIXED `backoff_delay_ms` (default 5000ms), not exponential.

### Step 4: Execution routing. MissionScheduler

File: `ping-runtime/orchestration/mission_scheduler.js`

`start()` (line 106): `setInterval(_poll, 5000)` + immediate `_poll()`. `maxConcurrent = 3`.

`_poll()` (line 123), three arrows in order:
- **Arrow 0**: for every mission_id in the in-memory `_processing` set, `missionRuntime.renewLease(missionId)` (60s). Runs before reaping; renewal failure is non-fatal.
- **Arrow 1**: `missionRuntime.reapExpiredLeases()` (catches orphaned missions from crashed schedulers).
- **Arrow 2**: if `_processing.size < maxConcurrent`, `getPending(availableSlots)` then `_dispatch(mission)` each.

`_dispatch(mission)` (line 168):
1. `workerName = MISSION_WORKER_MAP[mission.mission_type]` (label only, per the DOC-CONTRACT comment at line 20: NOT an execution decider).
2. Guard: `workerRuntime.getStats().workers[workerName]` must exist, else skip.
3. `_processing.add(mission_id)`; `assign()`; `start()`.
4. Build event dispatched on the ORIGINAL business `payload.event_type` (not mission_type), threading `event_id, namespace, source, mission_id, correlation_id, causation_id`.
5. **`const dispatchResult = await this._workerRuntime.dispatch(event)` -- NO TIMEOUT.** (See hung-worker hazard below.)
6. Outcomes: `status==='failed'` -> `_failMission`; `null/undefined` -> `_failMission("no worker matched...")` (phantom-complete prevention); else `missionRuntime.complete(mission_id, {worker, completed_at})`.
7. Throw -> `_failMission(err.message)`; `finally: _processing.delete(mission_id)`.

`_failMission(mission, error)` (line 262): `failWithRetry(mission_id, error, this._retryPolicy)`; if `retries >= max_attempts` (3) AND `deadLetterAuthority` wired -> `deadLetterAuthority.recordDeadLetter({...job, authority:'MissionScheduler'}, new Error(error))`. DLQ failure is caught and logged.

**Hung-worker hazard (verified by reading the code, no timeout exists):** if `worker.handle()` never resolves, `_dispatch` awaits forever. The mission stays in `_processing`, so Arrow 0 renews its lease every poll and the reaper never reclaims it. The `_processing` slot leaks; with `maxConcurrent=3`, three hung workers stall the scheduler permanently. There is no dispatch timeout anywhere in this path.

### Step 5: Worker execution. WorkerRuntime.dispatch()

File: `ping-runtime/workers/worker_runtime.js:79`

Dispatch-only mode (the `_poll()` loop is deliberately disabled; MissionScheduler is the single dispatch path).

`dispatch(event)`: for each registered worker whose `eventTypes` includes `event.event_type` and `running < maxConcurrent`: set `entry.worker._event = event` (namespace threading), then `await entry.worker.handle(event)`, then `entry.worker._event = null`. On throw: stats, rethrow to scheduler (P0-2). No timeout, no subprocess, no sandbox: execution is an in-process `await`.

`health()` (line 124) exists with a 60s stale threshold but **has zero callers** in `gateway/` or `ping-runtime/`.

### Step 6: Canonical workers

Registered by `registerCanonicalWorkers` (`ping-runtime/workers/canonical_workers.js:673`), all `maxConcurrent: 2`:

`observation` (all 22 business event types), `claim` (OBSERVATION_CREATED, CLAIM_GENERATE), `classification` (CLAIM_CREATED, CLASSIFICATION_CREATE), `recommendation` (CLASSIFICATION_CREATED, RECOMMENDATION_CREATE), `projection` (KNOWLEDGE_INDEX, PROJECTION_CREATE, RECOMMENDATION_CREATED, LINEAGE_CREATED), `replay` (REPLAY_VERIFY, PROJECTION_CREATED; wired to `KernelReplayExecutionProvider` -> in-process `DeterministicReplayEngine` in `gateway/replay/kernel/`), `witness` (WITNESS_CREATE, REPLAY_COMPLETED), `lineage` (LINEAGE_CREATE, WITNESS_CREATED). Plus `knowledge-promotion` (conditional on KnowledgeGraph). `intelligence` is registered-but-skipped (eventTypes:[]), structurally dormant per its DOC-CONTRACT comment.

Workers are pure in-process JS: zero `child_process`/`spawn`/`python` references in `canonical_workers.js`, `worker_runtime.js`, `mission_scheduler.js`, `mission_runtime.js`, `event_to_mission_bridge.js`, `unified_event_runtime.js` (all grep counts 0). **The JS spine never calls the Python ExecutionAuthority.**

### Step 7: Retry exhaustion and dead letter

Retry: `failWithRetry` (mission_runtime.js:207), fixed 5s backoff, max 3 attempts (scheduler default `{max_attempts: 3, backoff_delay_ms: 5000}`).

Exhaustion: status `failed` + `MISSION_FAILED` event + (now wired) `DeadLetterAuthority.recordDeadLetter()` (`gateway/dead_letter_authority.js:112`) writes to `repository_dead_letters` with: dead_letter_id (IdentityAuthority), original job id/type, mission_id, correlation/causation ids, retry_count, payload, error message/stack/code, RetryPolicy failure classification + `replayable` flag, and a WitnessAuthority witness + hash. Replay is manual (`getDeadLetter`, replay-marking UPDATEs at lines 360/374); nothing auto-replays.

Restart behavior: on process death, in-flight `_processing` is forgotten (in-memory). On next `_poll`, `reapExpiredLeases()` returns expired `running`/`assigned` missions to `created` for re-dispatch (at-least-once). `retry_pending` with elapsed `retry_at` is picked up by `getPending`. Completed/failed persist.

---

## 2. Python ExecutionAuthority (the other plane)

File: `runtime/authorities/execution_authority.py` (72 lines).

Symbols: `ExecutionRequest` dataclass; `ExecutionAdapter` Protocol; `SubprocessExecutionAdapter` (wraps `subprocess.run`); `ExecutionAuthority` with `run()`, `run_command()`, `run_docker()`.

Callers (all Python, none in the JS spine):
- `runtime/tool_router.py:33`: `authority.run_command('python', [path], timeout=15, ...)` -- CLI tool router reading JSON from stdin.
- `runtime/supervisor.py:28`: `authority.run_command('python', [TOOL_ROUTER], timeout=30, ...)` -- calls tool_router.
- `runtime/constitutional_event_loop.py:60`: `authority.run_docker(['exec', POSTGRES_CONTAINER, 'psql', ...], timeout=30)` -- polls a legacy `events` table (NOT `ping_events`) via docker exec.
- Also imported by `runtime/constitutional_runtime.py`, `runtime/cognitive/worker_protocol.py`, `projection_replay.py`.

**`ContainerExecutionAdapter` does not exist anywhere in the repo** (full-repo grep, excluding node_modules/worktrees: zero hits). The default adapter is `SubprocessExecutionAdapter`, not a container. The claimed chain "MissionScheduler -> Run -> ExecutionAuthority -> ContainerExecutionAdapter -> isolated container" has no source support: no `Run` class exists, no `(agent_id, run_id)` keying exists (zero `agent_id` hits in the spine), the JS spine never shells out, and there is no container adapter.

---

## 3. The 5-minute dispatch timeout: verdict

**No 5-minute dispatch timeout exists on the live spine.** The three 5-minute-adjacent mechanisms found:

1. `ping-runtime/temporal/workflows/mission_workflow.js:22`: `startToCloseTimeout: '5 minutes'` on Temporal activities. The temporal path is NOT wired into `gateway_runtime.js` (zero "temporal" references in the boot file). DORMANT.
2. `ping-runtime/orchestration/execution/worker_state_machine.js:78-86`: `isStuck(workerId, timeoutMs = 300000)` / `recoverStuckWorkers`. This belongs to Orca's parallel `ExecutionEngine`, and `recoverStuckWorkers` has zero callers anywhere. DEAD code.
3. The live spine's only stuckness machinery: 60s lease + per-poll renewal + reaper (see Step 4 hazard: hung workers are renewed forever, never reclaimed).

---

## 4. ping_missions.result and recordVerifiedResult: verdict

- `ping_missions.result` persistence is LIVE: `MissionRuntime.complete()` writes `result = JSONB({...result, duration_ms})` (mission_runtime.js:153-175).
- `recordVerifiedResult` **does not exist in source**. The only mention in the entire repo is `evidence/2026-09-18/PATCH_CONVERGENCE_REPORT.md:23` ("recordVerifiedResult() emits WORKER_COMPLETED/WORKER_FAILED"), which also claims a `RESULT_SCHEMA.json` that does not exist anywhere in the repo. CLAIMED-ONLY in a doc.
- `WORKER_COMPLETED`/`WORKER_FAILED` event types exist (`business_emitters.js:93-96`, `SystemEmitter.workerCompleted/workerFailed`) but the ONLY caller is the boot seed: `gateway_runtime.js:887` `systemEmitter.workerCompleted('observation', 'seed_mission', {documents: 3})` inside `_seedBusinessEvents()`. **On the live mission path, workers never emit WORKER_COMPLETED/WORKER_FAILED; only MISSION_COMPLETED/MISSION_FAILED are emitted.**

---

## 5. Worker supervision: verdict

No supervisor watches workers. Evidence:
- `WorkerRuntime.health()` exists (1-min stale threshold) with zero callers.
- Workers are in-process objects, not processes; "worker death" = `handle()` throws -> caught -> scheduler retry/DLQ path.
- Process-level death is handled only via lease expiry + reaper (at-least-once re-dispatch).
- Orca's `WorkerStateMachine` (with the 5-min stuck detection) belongs to the parallel ExecutionEngine and its recovery function is never called.

---

## 6. Orca ExecutionEngine on the live boot path: verdict

STILL THERE and initialized (gateway_runtime.js:339-344) with `discoverOllama: false`, per an explicit `[DOC-CONTRACT / KEEP-DISABLED]` comment: Orca is "a parallel execution authority, NOT the production spine."

What it actually executes with Ollama disabled (`ping-runtime/orchestration/execution/engine.js`):
- `initialize({discoverOllama:false})` skips `discoverWorkers()` (engine.js:102-103). Only `OpenCodeWorkerPort` is registered, with `executor: null` (engine.js:94-98).
- Builds: EventQueue, WorkerPortRegistry, CapabilityRegistry, WorkerStateMachine, MissionCompiler, Scheduler, ArtifactRouter, ConsensusEngine, ArtifactStore, OllamaProvider (registerOpenCode only), IntelligenceGraph, MergeGate, DormantClassifier, ReplayCertifier, ContextAuthority.
- `_executeMission` defers when no worker has the required capability ("No workers available ... deferring"); with executor:null and no Ollama workers, its missions cannot actually run models.
- It is exposed via `services.executionEngine` (line 657) and mounted at `/orchestration` routes (line 792-793: `createOrchestrationRoutes(services.executionEngine)`).
- It does NOT consume the event spine and the spine does not consume it. Parallel dashboard/planning authority.

---

## 7. LIVE / DORMANT / DEAD / CLAIMED-ONLY table

| Mechanism | File | Classification | Evidence |
|---|---|---|---|
| UnifiedEventRuntime.emit (event acceptance, ping_events) | ping-runtime/events/unified_event_runtime.js:83 | LIVE | Instantiated + initialized at gateway_runtime.js:433; EventBridge + emitters call it |
| EventBridge (repository_events/canonical_events -> ping_events) | ping-runtime/events/event_bridge.js | LIVE | Started at gateway_runtime.js:~470, 5s poll |
| EventToMissionBridge (event -> mission) | ping-runtime/orchestration/event_to_mission_bridge.js | LIVE | Started at gateway_runtime.js:576-580 |
| MissionRuntime (create/assign/start/complete/fail/failWithRetry/leases) | ping-runtime/orchestration/mission_runtime.js | LIVE | Instantiated gateway_runtime.js:476; all methods called by scheduler |
| MissionScheduler poll/dispatch (5s, maxConcurrent 3) | ping-runtime/orchestration/mission_scheduler.js | LIVE | Started gateway_runtime.js:553-561 |
| Lease acquisition (60s at assign) | mission_runtime.js:112 | LIVE | assign() |
| Lease renewal (Arrow 0, per poll) | mission_scheduler.js:129-140, mission_runtime.js:263 | LIVE | Tested by gateway/test_lease_renewal.js |
| Lease expiry reclaim (reaper) | mission_runtime.js:288 | LIVE | Arrow 1; emits MISSION_LEASE_EXPIRED |
| Retry (fixed 5s backoff, max 3) | mission_runtime.js:207 | LIVE | _failMission -> failWithRetry |
| Dead-letter on exhaustion (repository_dead_letters) | gateway/dead_letter_authority.js:112; wired mission_scheduler.js:262 | LIVE | Now injected at gateway_runtime.js:545-552 |
| ping_missions.result persistence | mission_runtime.js:153 | LIVE | complete() writes JSONB result + duration_ms |
| WorkerRuntime.dispatch (in-process handle) | ping-runtime/workers/worker_runtime.js:79 | LIVE | Called by scheduler; dispatch-only mode |
| 8 canonical workers + knowledge-promotion | ping-runtime/workers/canonical_workers.js:673 | LIVE | Registered at boot; replay via in-process DeterministicReplayEngine |
| MISSION_* canonical events | mission_runtime.js | LIVE | CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED emitted |
| Orca ExecutionEngine (discoverOllama:false, /orchestration routes) | ping-runtime/orchestration/execution/engine.js | LIVE (parallel) | Initialized gateway_runtime.js:339; mounted at /orchestration |
| Python ExecutionAuthority (subprocess adapter) | runtime/authorities/execution_authority.py | LIVE (separate plane) | Used by tool_router/supervisor/constitutional_event_loop; NOT by the JS spine |
| IntelligenceWorker | ping-runtime/workers/canonical_workers.js:712-727 | DORMANT | eventTypes:[] -> registration skipped; DOC-CONTRACT keep-dormant |
| Temporal mission workflow (5-min startToCloseTimeout, approval signal) | ping-runtime/temporal/workflows/mission_workflow.js | DORMANT | Zero references in gateway_runtime.js boot |
| WorkerRuntime.health() | ping-runtime/workers/worker_runtime.js:124 | DORMANT | Zero callers in gateway/ or ping-runtime/ |
| gateway/worker_registry.js (event-sourced registry) | gateway/worker_registry.js | DORMANT | Not required by gateway_runtime.js or server.js |
| ExecutionEngine Ollama worker discovery | engine.js:102-103 | DORMANT | KEEP-DISABLED doc-contract; proven functional but intentionally off |
| WorkerStateMachine.recoverStuckWorkers (5-min) | ping-runtime/orchestration/execution/worker_state_machine.js:86 | DEAD | Zero callers; Orca-internal |
| scripts/worktree_executor.py (worktrees/<mission_name>) | scripts/worktree_executor.py | DEAD (unwired) | Standalone script; not called by the spine |
| ContainerExecutionAdapter | (nonexistent) | CLAIMED-ONLY | Zero hits repo-wide |
| recordVerifiedResult / RESULT_SCHEMA.json / verifyResultEnvelope | (nonexistent) | CLAIMED-ONLY | Only in evidence/2026-09-18/PATCH_CONVERGENCE_REPORT.md:23 |
| "Verified results emit WORKER_COMPLETED/WORKER_FAILED" on the live path | business_emitters.js:93-96 | CLAIMED-ONLY | Only caller is the boot seed (gateway_runtime.js:887); live path emits MISSION_* only |
| Run entity / (agent_id, run_id) worktree ownership | (nonexistent) | CLAIMED-ONLY | No Run class; zero agent_id hits in the spine; JS spine never shells out |
| 5-minute scheduler dispatch timeout | (nonexistent) | CLAIMED-ONLY | No such timeout in source; nearest matches are dormant/dead (see section 3) |

Tests covering the live spine: `gateway/test_lease_renewal.js` (Arrow 0/1), `gateway/test_commissioning.js`, `gateway/test_durability_invariants.js`, `gateway/test_mission_scheduler_time_authority.js`, `evals/constitutional-runtime/EVAL-006_double_completion_prevention.js`, `EVAL-007_worker_failure_propagation.js`.
