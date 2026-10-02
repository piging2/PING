# AGENT 09 — Execution Boundary: Mission → Adapter → Worker → Result/Evidence → PING

**Lane:** MISSION + SCHEDULER + WORKERS (TenantOS autonomous-convergence wave)
**Mode:** read-only investigation, massively parallel. Did NOT wait on Event Authority certification.
**Date:** 2026-09-23
**Repos (read-only, port 3100 untouched):**
- `/home/nolan/ping` — live gateway repo, branch `refactor/runtime-authority-convergence` (HEAD `cc6856c3b` "feat(ping): register FYD_SITE_OVERLAY event for FYD site overlays")
- `/home/nolan/projects/ping` — website repo (Next.js)

**Bridge health:** two SSH commands aborted mid-run (~20:40 MDT); retried with 20s backoff, recovered. One command backgrounded after 146s (delivered later). Outages recorded, no idling; investigation continued on cached reads.

**No new canonical authority is created by this report.** Every proposal is an evidence-backed patch to existing components, in the style of `priority_boundary.js` (explicitly "ADAPTER ONLY").

---

## 1. Live topology: the actual execution path (verified in code)

The live spine is assembled imperatively in `gateway/bootstrap/gateway_runtime.js` (`_initializeServices`, ~lines 425-585). There is no DI container on the mission path (the `di_container.js`/`wiring.js`/`BackgroundWorkers` bootstrap is an alternate, unused bootstrap — `gateway_runtime.js` never references it).

```
Business emitters (Review/Customer/Project/Connector/System)
  → CanonicalizationService (namespace boundary; tenant::hpp / core::system)
  → UnifiedEventRuntime.emit()            [ping-runtime/events/unified_event_runtime.js]
       persists to ping_events (content-hash event_id, fail-closed if no pool)
       governance + namespace resolution at this single choke point
       ↓ in-process subscribers
  ├→ EventToMissionBridge                 [ping-runtime/orchestration/event_to_mission_bridge.js]
  │     EVENT_MISSION_MAP: 29 event types → missionType + priority (0-3)
  │     threads correlation_id; canonicalPriority() at ingress (priority_boundary.js)
  │     → MissionRuntime.create(missionType, payload, {priority, createdBy})
  │          mission_id = sha256(missionType:event_id)[:16] — idempotent by construction
  │          ON CONFLICT DO NOTHING; emits MISSION_CREATED
  │
  ├→ MissionScheduler._poll() every 5s     [ping-runtime/orchestration/mission_scheduler.js]
  │     Arrow 0: renewLease(missionId) for every mission in in-memory _processing set
  │     Arrow 1: reapExpiredLeases() → expired running/assigned → created (orphan recovery)
  │     Arrow 2: getPending(n) (created, or retry_pending with retry_at <= NOW; priority DESC)
  │       → _dispatch(mission):
  │           workerName = MISSION_WORKER_MAP[mission.mission_type]   ← LABEL ONLY (see record R-06)
  │           guard: WorkerRuntime.getStats().workers[workerName] must exist
  │           assign(missionId, workerName)   → status created→assigned, lease 60s  [rowCount DISCARDED — R-13]
  │           start(missionId)                → status assigned→running
  │           build dispatch envelope on payload.event_type (ORIGINAL business event, not mission_type)
  │           → WorkerRuntime.dispatch(event) [ping-runtime/workers/worker_runtime.js]
  │                for EVERY registered worker with eventTypes.includes(event_type) AND capacity:
  │                   worker._event = event (namespace/correlation stash for BaseWorker._emit)
  │                   result = await worker.handle(event)      ← sequential, last result returned
  │                throw on worker error (P0-2) → scheduler catch
  │           outcome:
  │             status 'failed'  → _failMission → failWithRetry → retry_pending | failed
  │             null/no-match   → _failMission (phantom-complete prevention; mislabeled "skip")
  │             'ok'/'rejected' → MissionRuntime.complete(missionId, {worker, completed_at})
  │           exhaustion (retries >= max_attempts=3) → DeadLetterAuthority.recordDeadLetter
  │                [gateway/dead_letter_authority.js] → repository_dead_letters (witnessed, replayable flag)
  │
  └→ 8 canonical JS workers               [ping-runtime/workers/canonical_workers.js]
        observation (all BUSINESS_EVENTS) → OBSERVATION_CREATED
        claim (OBSERVATION_CREATED, CLAIM_GENERATE) → CLAIM_CREATED
        classification (CLAIM_CREATED, CLASSIFICATION_CREATE) → CLASSIFICATION_CREATED
        recommendation (CLASSIFICATION_CREATED, RECOMMENDATION_CREATE) → RECOMMENDATION_CREATED
        projection (KNOWLEDGE_INDEX, PROJECTION_CREATE, RECOMMENDATION_CREATED, LINEAGE_CREATED) → PROJECTION_CREATED (+Qdrant)
        replay (REPLAY_VERIFY, PROJECTION_CREATED) → REPLAY_COMPLETED (verified ONLY if kernel violations==0)
        witness (WITNESS_CREATE, REPLAY_COMPLETED) → WITNESS_CREATED | WITNESS_REJECTED (refuses unverified)
        lineage (LINEAGE_CREATE, WITNESS_CREATED) → LINEAGE_CREATED
        intelligence: DORMANT (eventTypes: [] — never registered; duplicates classification+recommendation)
        Each worker's downstream emits flow back through UnifiedEventRuntime.emit(),
        which re-triggers EventToMissionBridge → the pipeline is event-recursive by design.
        BaseWorker._emit preserves: namespace, correlation_id, causation_id=trigger event_id,
        confidence (explicit-or-inherited, Object.hasOwn canonical check). Emit failure THROWS.
```

**Tables:** `ping_missions` (MissionRuntime), `ping_events` (UnifiedEventRuntime), `repository_dead_letters` (DeadLetterAuthority).

**Parallel / dormant execution systems found (NOT on the live path):**
- Orca `ExecutionEngine` (`ping-runtime/orchestration/execution/engine.js`) — instantiated in gateway_runtime with `discoverOllama: false`; DOC-CONTRACT KEEP-DISABLED ("parallel execution authority, NOT the production spine").
- `orchestration/execution/{scheduler,worker_state_machine,mission_compiler,event_queue}.js` — Orca-side; `mission_compiler` is required only by Orca's engine, never by the live spine.
- `orchestration/dispatcher.js` — graph-entropy dev-productivity dispatcher, unrelated to missions.
- `orchestration/worker_registry.js` + `gateway/background_workers.js` — consumed only via `bootstrap/wiring.js` → `bootstrap/index.js` `wireContainer`, which `gateway_runtime.js` never calls.
- `execution/worker_port.js` — LLM worker ports (OpenCode/Ollama/Devin): capability/registry abstraction, no mission wiring.
- Python runtime (`workers/worker_runtime.py` + 6 Python workers) — preserved alternate executor, HTTP poll model (see §6).

---

## 2. Component records (shared record format)

### R-01 — EventToMissionBridge

- **DOMAIN:** mission-ingress
- **COMPONENT:** `EventToMissionBridge` — `/home/nolan/ping/ping-runtime/orchestration/event_to_mission_bridge.js` (154 lines)
- **CLAIM:** Pure ingress adapter: subscribes to 29 business event types on UnifiedEventRuntime and creates exactly one mission per event via `MissionRuntime.create`. Declares missionType + priority only; worker identity is resolved downstream (the historical `worker` field was removed as dead data). Threads root `correlation_id` through the whole chain; normalizes priority via `canonicalPriority()` at this single ingress boundary.
- **EVIDENCE:** `EVENT_MISSION_MAP` (29 entries, e.g. `LEAD_CREATED: { missionType: 'LEAD_FOLLOWUP', priority: 3 }`, `SYSTEM_HEALTH_CHECK: { missionType: 'SYSTEM_AUDIT', priority: 0 }`); `_handleEvent` calls `this._missionRuntime.create(mapping.missionType, {...event fields, correlation_id}, { priority: canonicalPriority(mapping.priority), createdBy: 'event-to-mission-bridge' })`; header comment "The bridge does NOT modify state — it only creates missions."
- **CALLER:** `UnifiedEventRuntime` (event subscription); constructed+started in `gateway/bootstrap/gateway_runtime.js:576-581`.
- **CALLEE:** `MissionRuntime.create`; `canonicalPriority` (`ping-runtime/boundaries/priority_boundary.js`).
- **WRITER:** MissionRuntime (via create).
- **READER:** MissionScheduler (reads created missions via getPending).
- **AUTHORITY:** Event Authority (UnifiedEventRuntime owns event truth); bridge is an adapter, not an authority — it creates no event truth, only mission rows.
- **CLASSIFICATION:** KEEP
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** none in the bridge itself. Note: bridge `start()` degrades silently (console.log only) when dependencies are missing — acceptable for an adapter, but the "degraded" state is not observable to Mission Control.
- **DEPENDENCIES:** UnifiedEventRuntime, MissionRuntime, priority_boundary.
- **AFFECTS AGENTS:** 01 (event authority — the bridge is the largest downstream consumer of emitted business events); 02 (mission control surface reads `ping_missions`).

### R-02 — MissionRuntime

- **DOMAIN:** mission-lifecycle
- **COMPONENT:** `MissionRuntime` — `/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js` (412 lines). Table `ping_missions`.
- **CLAIM:** Single canonical mission store. Lifecycle: `created → assigned → running → completed | failed`, plus `retry_pending`. All state transitions are conditional SQL (`WHERE status = ...`), so stale/concurrent transitions fail closed (rowCount 0). `create()` is idempotent by construction: `mission_id = sha256(missionType:event_id)[:16]`, `ON CONFLICT DO NOTHING`. Emits `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED` on successful transitions. `getTrace()` resolves the causal event chain via `correlation_id` (fixed from an earlier mission_id-hash lookup bug).
- **EVIDENCE:** `initialize()` DDL with columns `mission_id, mission_type, status, priority, payload, result, assigned_to, created_by, created_at, started_at, completed_at, error, retries, retry_at, lease_until, claimed_at`; `assign()` — `UPDATE ... SET status='assigned', assigned_to=$1, claimed_at=NOW(), lease_until=NOW()+INTERVAL '60 seconds' WHERE mission_id=$2 AND status='created'`; `start()`/`complete()`/`fail()` all carry `AND status IN (...)` guards; `getPending()` — `WHERE status='created' OR (status='retry_pending' AND retry_at <= NOW()) ORDER BY priority DESC, created_at ASC`.
- **CALLER:** EventToMissionBridge (create), MissionScheduler (assign/start/complete/fail/failWithRetry/renewLease/reapExpiredLeases/getPending/getActive/getStats/getTrace).
- **CALLEE:** pg pool; UnifiedEventRuntime (transition events).
- **WRITER:** bridge + scheduler.
- **READER:** scheduler, Mission Control routes, `getTrace`/`getAllTraces` evidence consumers.
- **AUTHORITY:** MissionRuntime is the single source of truth for mission state (scheduler header: "Single source of truth: MissionRuntime"). It does NOT own worker identity or execution routing.
- **CLASSIFICATION:** KEEP (with patches R-12..R-15)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** `renewLease` binds no holder (R-12); no fencing token on reclaim (R-13/R-14); phantom `reclaimRetryPending()` referenced in docs but never implemented (R-15); dead `require('constitutional_time_authority')` inside `create()` (unused import).
- **DEPENDENCIES:** Postgres `pg` pool; UnifiedEventRuntime (optional).
- **AFFECTS AGENTS:** 02 (MC reads ping_missions; swarm-08 P0 F-01 "competing mission authority" is addressed by this being the single store), 01 (transition events feed the event log).

### R-03 — MissionScheduler

- **DOMAIN:** scheduling
- **COMPONENT:** `MissionScheduler` — `/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js` (343 lines)
- **CLAIM:** Poll loop (default 5s, maxConcurrent=3) bridging MissionRuntime ↔ WorkerRuntime. Each poll: (Arrow 0) renew leases for the in-memory `_processing` set; (Arrow 1) `reapExpiredLeases()` orphan recovery; (Arrow 2) dispatch up to capacity. `_dispatch` resolves the label worker via `MISSION_WORKER_MAP`, guards on registration, claims/starts the mission, builds the dispatch envelope on the ORIGINAL `payload.event_type` (never `mission_type` — phantom-complete prevention), awaits `WorkerRuntime.dispatch(event)`, then completes or fails with retry → DLQ on exhaustion (`_failMission` → `failWithRetry` → `DeadLetterAuthority.recordDeadLetter` when wired).
- **EVIDENCE:** `_poll()` three-arrow structure with comments; `_dispatch` lines ~200-280; `_failMission` DLQ call passes `{job_id, job_type, mission_id, correlation_id, causation_id, authority: 'MissionScheduler', authority_version: '1.0.0', created_at, retry_count, payload}` + `new Error(error)`; constructor accepts `deadLetterAuthority` (P0-5) — gateway_runtime now injects it (was "permanently unreachable" before).
- **CALLER:** `gateway_runtime.js:553-562` (start). Nobody else constructs it.
- **CALLEE:** MissionRuntime, WorkerRuntime, DeadLetterAuthority (optional), `constitutionalTimeAuthority` (completed_at stamp).
- **WRITER:** MissionRuntime (state transitions), DeadLetterAuthority (on exhaustion).
- **READER:** `getStats()` consumers (Mission Control).
- **AUTHORITY:** Owns scheduling policy (poll cadence, capacity, ordering, retry policy config) — NOT mission state (MissionRuntime) and NOT worker selection (WorkerRuntime.dispatch).
- **CLASSIFICATION:** KEEP (with patches R-13, R-15)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** discards `assign()` rowCount before `start()`+dispatch (R-13 — cross-scheduler double-execution); "skipped" log line actually routes to `_failMission` (misnomer, but fail-closed); retry_pending missions are re-dispatched with `assign`/`start`/`complete` all no-op'ing → infinite re-dispatch loop on the success path (R-15).
- **DEPENDENCIES:** MissionRuntime, WorkerRuntime, DeadLetterAuthority, pg.
- **AFFECTS AGENTS:** 02 (scheduler stats feed MC), 11 (run-state authority — scheduler owns in-flight `_processing`, not persisted).

### R-04 — WorkerRuntime (canonical execution decider)

- **DOMAIN:** worker-dispatch
- **COMPONENT:** `WorkerRuntime` — `/home/nolan/ping/ping-runtime/workers/worker_runtime.js` (194 lines)
- **CLAIM:** The SINGLE canonical execution decider (per P3 audit A, cited in mission_scheduler's DOC-CONTRACT): a worker is selected iff `entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)`. Registration requires `worker.handle(event)`. `dispatch(event)` runs every matching worker with capacity SEQUENTIALLY and returns the LAST result; throws on worker error (P0-2 → scheduler retry path). Empty `eventTypes` = dormant (fixed from an earlier catch-all bug). Stashes `worker._event = event` so `BaseWorker._emit` can preserve namespace/correlation. Dispatch-only mode: the old `_poll()` HTTP loop is disabled by comment ("MissionScheduler is the single dispatch path") — the method still exists but is never called.
- **EVIDENCE:** `dispatch()` lines 69-108; `register()` lines 29-47 (`maxConcurrent` default 1, `running` counter, `lastHeartbeat`); header comment "Extracted from 38 worker implementations across 7 generations"; `start()` logs "dispatch-only mode".
- **CALLER:** MissionScheduler._dispatch (sole live caller). Test files.
- **CALLEE:** registered workers' `handle(event)`.
- **WRITER:** workers (via handle results); `getStats()` is read by scheduler as the registered-worker guard.
- **READER:** MissionScheduler (`getStats().workers[workerName]`), health checks.
- **AUTHORITY:** Owns worker identity/selection and per-worker capacity. Does NOT own mission state or scheduling policy.
- **CLASSIFICATION:** KEEP (with patch R-16 multi-match semantics)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** multi-match runs ALL matching workers, returns only the last result (R-16); capacity-full workers are silently skipped with no backpressure signal to the scheduler (mission was already claimed — it will complete as if the busy worker ran it, or rather: dispatch returns null → scheduler treats as no-match → failWithRetry — a busy worker looks like a missing worker); `lastHeartbeat` only updates on dispatch so idle workers report `stale` in `health()` (false positive); dead `_poll()`/`_gatewayUrl` code retained.
- **DEPENDENCIES:** none (in-process).
- **AFFECTS AGENTS:** 02 (MC worker stats), 11.

### R-05 — Canonical JS workers + BaseWorker

- **DOMAIN:** worker-execution
- **COMPONENT:** `BaseWorker` + 8 canonical workers + dormant `IntelligenceWorker` — `/home/nolan/ping/ping-runtime/workers/canonical_workers.js` (760 lines), `intelligence_worker.js` (185 lines). Registered by `registerCanonicalWorkers(workerRuntime, {eventRuntime, pool, aiRuntime, embeddingService, knowledgeGraph, replayProvider})`.
- **CLAIM:** Workers are pure `handle(event) → {status, ...}` functions with one hard contract: `BaseWorker._emit` preserves namespace / correlation_id / causation_id (= trigger event_id) / confidence (explicit-or-inherited via `Object.hasOwn`) on every downstream emission through `UnifiedEventRuntime.emit()`, and THROWS if the emit is not `ok`. Result statuses: `'ok'` (done), `'failed'` (scheduler retries), `'rejected'` (WitnessWorker's deliberate refusal to attest an unverified replay → emits `WITNESS_REJECTED`). ReplayWorker attests `verified: true` ONLY when the kernel replay engine reports zero violations (the old unconditional `verified: true` stub was removed); without a provider it emits `verified: false, reason: 'no_replay_provider'`. ObservationWorker is the universal entry point (registered for all 22 BUSINESS_EVENTS).
- **EVIDENCE:** `BaseWorker._emit` lines 31-72; `registerCanonicalWorkers` registration table (~lines 660-740); `IntelligenceWorker` skipped via `eventTypes: []` with a DOC-CONTRACT explaining the duplication with classification+recommendation and the two re-enablement conditions; `ReplayWorker._buildAuthorityEvidence` — "Preserve, never fabricate... absent values are omitted (never defaulted)".
- **CALLER:** WorkerRuntime.dispatch.
- **CALLEE:** UnifiedEventRuntime.emit; (ProjectionWorker) EmbeddingService→Qdrant; (ReplayWorker) KernelReplayExecutionProvider.
- **WRITER:** ping_events (downstream events); Qdrant (projection).
- **READER:** EventToMissionBridge (downstream events become new missions — the recursive pipeline).
- **AUTHORITY:** Each worker owns its domain transform (observation→claim→...→lineage); none owns routing or mission state.
- **CLASSIFICATION:** KEEP. This is the reference implementation for the adapter's evidence obligations (§4).
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** none structural. Minor: `ClassificationWorker`/`RecommendationWorker` emit string priorities (`'urgent'|'high'|...`) that are EXECUTION-INERT (priority_boundary documents this as live-produced but never consulted — KEEP as documented).
- **DEPENDENCIES:** UnifiedEventRuntime, constitutional_time_authority, optional embeddingService/knowledgeGraph/replayProvider.
- **AFFECTS AGENTS:** 01 (downstream events re-enter the event log — the bridge→scheduler→worker→event loop is the convergence-critical cycle).

### R-06 — MISSION_WORKER_MAP

- **DOMAIN:** worker-labeling
- **COMPONENT:** `MISSION_WORKER_MAP` — defined in `mission_scheduler.js` (lines 22-73), imported by `event_to_mission_bridge.js` (grep hit) and gateway tests.
- **CLAIM:** LABELING / ASSIGNMENT metadata ONLY — not an execution-routing decider (DOC-CONTRACT in-file, citing `docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md` audit A). Consumed for (a) the `assigned_to` label on claim and (b) the registered-worker guard. Scheduler dispatches on `payload.event_type`, never `mission_type`; a label/event mismatch yields dispatch()=null → fail path (phantom-complete prevention), not misrouting. NOTE: `event_to_mission_bridge.js` matched the grep for MISSION_WORKER_MAP — the bridge imports it (its header comment says the `worker` field was removed from EVENT_MISSION_MAP because worker identity is resolved by the scheduler via this map; the bridge no longer reads it — verify before relying on the import).
- **EVIDENCE:** DOC-CONTRACT comment block lines 24-39; `_dispatch` uses it only for `workerName` label + `stats.workers[workerName]` guard; dispatch envelope built from `payload.event_type || mission.mission_type`.
- **CALLER:** MissionScheduler._dispatch; (import) EventToMissionBridge.
- **CALLEE:** none.
- **WRITER:** n/a (static config).
- **READER:** scheduler.
- **AUTHORITY:** none — advisory metadata. Canonical decider is WorkerRuntime.dispatch.
- **CLASSIFICATION:** KEEP (as documented)
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** the name invites misuse as a router; the DOC-CONTRACT exists precisely because of this. The bridge's stale import should be removed or the comment verified.
- **DEPENDENCIES:** none.
- **AFFECTS AGENTS:** all convergence agents — this is the documented answer to "who decides which worker runs."

### R-07 — DeadLetterAuthority + mission DLQ path

- **DOMAIN:** dead-letter
- **COMPONENT:** `DeadLetterAuthority` — `/home/nolan/ping/gateway/dead_letter_authority.js` (~380 lines). Table `repository_dead_letters`.
- **CLAIM:** Centralized, witnessed dead-letter store. `recordDeadLetter(job, error, options)` requires a job envelope `{job_id, job_type, mission_id, correlation_id, causation_id, authority, authority_version, created_at, retry_count, payload}`; generates the DL ID via `identityAuthority.generateDeadLetterId(job.job_id)`; classifies failure via `RetryPolicy.forJobType(job.job_type)` → `failure_reason` + `replayable` boolean; witnesses via `witnessAuthority.createWitness`; persists to `repository_dead_letters`. `replayDeadLetter(deadLetterId, replayFn)` replays ONLY if `replayable`, via a CALLER-SUPPLIED `replayFn`; marks replayed (replayable=false + replayed_at) on success, records replay failures in metadata. Retention: `cleanOldDeadLetters(30d)` deletes only `replayable=false`.
- **EVIDENCE:** full file read; `recordDeadLetter` lines ~110-200; `replayDeadLetter` lines 262-295; scheduler `_failMission` wires it on `retries >= max_attempts` (gateway_runtime:541-552 comment: "DLQ path was permanently unreachable (constructor accepted it but gateway never injected it). Now instantiated and injected").
- **CALLER:** MissionScheduler._failMission (sole live writer). No live callers of `replayDeadLetter` (grep: only definition site).
- **CALLEE:** identityAuthority, RetryPolicy, witnessAuthority, pg pool.
- **WRITER:** MissionScheduler.
- **READER:** operators via `getDeadLetter(s)`, `getStats`; `replayDeadLetter` callers (currently none live).
- **AUTHORITY:** Owns dead-letter records and replay bookkeeping. Does NOT own the replay EXECUTION (replayFn is caller-supplied).
- **CLASSIFICATION:** KEEP (with patch R-17: canonical mission-replay adapter)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** replay is operator-only — there is no canonical way to turn a dead mission letter back into a mission (R-17). `recordDeadLetter` is also the ONLY writer path; nothing else in the codebase dead-letters (good — single writer).
- **DEPENDENCIES:** pg, identity/canonical/witness authorities, RetryPolicy.
- **AFFECTS AGENTS:** 06 (adversarial/failure harness — DLQ is the terminal failure state), 02 (MC should surface DLQ).

### R-08 — Python worker runtime (preserved)

- **DOMAIN:** worker-execution (alternate)
- **COMPONENT:** `workers/worker_runtime.py` (140 lines) + Python workers (`claim_worker.py`, `lineage_worker.py`, `observation_worker.py`, `projection_worker.py`, `replay_worker.py`, `witness_worker.py`, `repository_client.py`, `filesystem_worker.py`); dispatch via `kernel/event_dispatcher.py` (`EventDispatcher`: `handlers: Dict[str, handler]`, single handler per event type).
- **CLAIM:** Preserved alternate executor on the HTTP poll model: `GET /events/unprocessed` → `dispatcher.dispatch(event)` → `POST /events/processed` | `POST /events/failed`. The gateway still serves those endpoints (`gateway/routes/events.js:129-150`, backed by `eventReadAuthority`). The Python pipeline speaks a DIFFERENT event vocabulary than the JS spine (e.g. Python `CLAIM_GENERATED` vs JS `CLAIM_CREATED`; Python `Event` dataclass carries `aggregate_id/aggregate_type/event_data`, and `event_from_api` drops `metadata` → `metadata=None`, losing the spine's correlation/causation/namespace/confidence envelope). It has no mission concept, no leases, no retry policy, no DLQ — failures are only marked via `/events/failed`.
- **EVIDENCE:** `worker_runtime.py` main loop; `claim_worker.py` header "Consumes: OBSERVATION_CREATED / Produces: CLAIM_GENERATED"; `kernel/event_dispatcher.py` single-handler-per-type map; `gateway/routes/events.js` unprocessed/processed/failed routes; `event_from_api` sets `metadata=None`.
- **CALLER:** standalone process (`__main__` loop, env `GATEWAY_URL`, `POLL_INTERVAL`, `MAX_RETRIES`, `WORKER_NAME`).
- **CALLEE:** gateway HTTP API; `repository_client.emit_event` (RepositoryAuthority API) for downstream emission.
- **WRITER:** `eventReadAuthority` (processed/failed marks); RepositoryAuthority (downstream events).
- **READER:** none on the JS mission path.
- **AUTHORITY:** none on the live spine — preserved/legacy. Must never compete with MissionScheduler for the same events (it reads "unprocessed events" via `eventReadAuthority.getUnprocessedEvents`, a different cursor than `ping_missions`).
- **CLASSIFICATION:** PROPAGATE (as an alternate execution backend behind the adapter contract, §4) — do NOT delete; the vocabulary/metadata gaps are adapter work, not deletion work.
- **CONFIDENCE:** 0.9 (vocabulary table partially verified — see note below)
- **BROKEN BOUNDARY:** metadata dropped at `event_from_api` (correlation/namespace/confidence lost — privacy-boundary risk if re-enabled against the live event log); vocabulary drift (`CLAIM_GENERATED` vs `CLAIM_CREATED`) means Python output does NOT feed `EVENT_MISSION_MAP`; no lease/retry/DLQ participation.
- **DEPENDENCIES:** gateway HTTP API, Postgres (via repository_client), `kernel/event_dispatcher`.
- **AFFECTS AGENTS:** 01 (event vocabulary convergence), 10 (Python/JS duality).

> Vocabulary drift (verified 2026-09-23): Python `observation_worker` consumes `DOCUMENT_IMPORTED` (JS: `DOCUMENT_IMPORT`) → produces `OBSERVATION_CREATED` (same); Python `claim_worker` consumes `OBSERVATION_CREATED` (same) → produces `CLAIM_GENERATED` (JS: `CLAIM_CREATED`); Python `witness_worker` consumes `REPLAY_EXECUTED` (JS: `REPLAY_COMPLETED`) → produces `WITNESS_CREATED` (same); Python `lineage_worker` consumes `WITNESS_CREATED` → produces `LINEAGE_CREATED` (same). So even where the pipeline stages align, the Python output vocabulary does not feed `EVENT_MISSION_MAP` (which keys on `CLAIM_CREATED`, etc.).
>
> Note: `projection_worker.py` / `replay_worker.py` headers were not captured (bridge stall); the structural findings above do not depend on them.

### R-09 — UnifiedEventRuntime (execution-adjacent)

- **DOMAIN:** event-ingress
- **COMPONENT:** `UnifiedEventRuntime` — `/home/nolan/ping/ping-runtime/events/unified_event_runtime.js`. Table `ping_events`.
- **CLAIM:** The event side of the boundary. `emit(eventType, source, payload, options)` generates a DETERMINISTIC content-hash `event_id` (sha256 of `{eventType, source, [namespace], [logical_id|payload]}` — no Date.now, idempotent retries preserved); validates event type; resolves namespace EXACTLY ONCE here (the single owner of the `core::system` default); fail-closed persistence (`{status:'error'}` if no pool — never returns ok without durability); detects event-ID collisions with different payload semantics. Returns `{status:'ok'|'error', eventId, ...}`. Workers MUST throw on non-ok (BaseWorker._emit does). Causal traversal indexes on `metadata->>'causation_id'` / `metadata->>'correlation_id'`.
- **EVIDENCE:** `emit()` lines 73-~200; step comments 1-5 ("Generate deterministic event_id", "Validate event type", "Check governance", "Build canonical event", "Persist - fail closed").
- **CALLER:** CanonicalizationService (business emitters), BaseWorker._emit, MissionRuntime (transition events), routes.
- **CALLEE:** eventValidator, eventGovernance, integrationManager, pg.
- **AUTHORITY:** Event Authority domain (Agent 01's lane) — consumed here as the evidence substrate, not redefined.
- **CLASSIFICATION:** KEEP (reference, not this lane's to change)
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** none found in this lane's scope.
- **DEPENDENCIES:** pg, validator/governance.
- **AFFECTS AGENTS:** 01.

### R-10 — PriorityBoundary (adapter precedent)

- **DOMAIN:** adapter-precedent
- **COMPONENT:** `canonicalPriority()` — `/home/nolan/ping/ping-runtime/boundaries/priority_boundary.js`
- **CLAIM:** The in-repo precedent for what this report proposes: an "ADAPTER ONLY" module with a DOC-CONTRACT ("RULE: No new business logic in this module. It maps values, nothing else."). Single canonical priority scale int 0-3 (higher = more urgent); single ingress at the bridge; scheduler reads the persisted int and never recomputes. Explicitly exists so dormant scales (Orca 1-10, IntelligenceWorker strings) can be wired in WITHOUT modifying bridge/scheduler/mission_runtime.
- **EVIDENCE:** file header DOC-CONTRACT (verified by read).
- **CLASSIFICATION:** KEEP — and MIMIC for the execution adapter (§4).
- **CONFIDENCE:** 1.0
- **AFFECTS AGENTS:** all — this is the pattern to copy.

### R-11 — Website repo (`/home/nolan/projects/ping`)

- **DOMAIN:** website
- **COMPONENT:** Next.js site (`src/`)
- **CLAIM:** NO mission/scheduler/worker runtime surfaces exist in the website repo. `mission`/`scheduler` greps hit only architecture-DISPLAY components (`src/components/architecture/{tenant-model, replay-evidence, multi-runtime, hero-evidence-card, system-topology, agent-authority, hero-system}.tsx`) and unrelated sentiment-library code. The execution substrate lives entirely in `/home/nolan/ping`.
- **EVIDENCE:** `grep -rln -i mission|schedule src/` hits listed above; `src/lib/infrastructure/controller.ts` contains zero mission/scheduler references.
- **CLASSIFICATION:** DROP (from this lane's scope — nothing to converge here)
- **CONFIDENCE:** 0.9
- **AFFECTS AGENTS:** 02 (if MC UI ever needs live mission data, it must read the gateway repo's `ping_missions`/routes, not the website repo).

---

## 3. Lease audit (P0: "renewLease binds nothing" — VERIFIED)

### R-12 — renewLease binds no holder (P0 CONFIRMED)

- **DOMAIN:** leases
- **COMPONENT:** `MissionRuntime.renewLease(missionId, durationSeconds=60)` — `mission_runtime.js` (~lines 250-270)
- **CLAIM:** The P0 is confirmed against live code. The SQL is `UPDATE ping_missions SET lease_until = NOW() + INTERVAL '1 second' * $1 WHERE mission_id = $2 AND status IN ('running','assigned') AND lease_until IS NOT NULL`. There is NO predicate on `assigned_to`, no fencing token, no holder identity of any kind. Any caller that knows a mission_id can extend any other holder's lease. The scheduler's Arrow 0 calls `renewLease(missionId)` with the default 60s and no holder argument at all.
- **EVIDENCE:** full `renewLease` body read; scheduler `_poll` Arrow 0: `await this._missionRuntime.renewLease(missionId)` — single argument.
- **CALLER:** MissionScheduler._poll (Arrow 0).
- **CALLEE:** pg.
- **WRITER:** any scheduler instance.
- **READER:** `reapExpiredLeases()`.
- **AUTHORITY:** MissionRuntime (lease table owner) — but it enforces no holder binding, so the "authority" is nominal.
- **CLASSIFICATION:** REFACTOR (patch P-09a below — holder-bound renewal; no new authority)
- **CONFIDENCE:** 1.0
- **BROKEN BOUNDARY:** lease renewal is not bound to the lease holder. Two scheduler instances (e.g. overlapping deploys, gateway restart) renew each other's leases; a crashed scheduler's orphan can have its lease extended by a foreign renewal, defeating `reapExpiredLeases()` orphan recovery. Renewal predicates: status in (running, assigned) + lease_until NOT NULL. Expiry: `lease_until < NOW()` → reset to `created`, `assigned_to/lease_until/claimed_at` cleared, `retry_at = NOW()`, emits `MISSION_LEASE_EXPIRED`.
- **DEPENDENCIES:** pg.
- **AFFECTS AGENTS:** 11 (run-state), 02 (MC lease display), coordinator (command roles: lease health is coordinator-held per wave invariants).

### R-13 — claim is stealable across schedulers; assign() rowCount discarded

- **DOMAIN:** leases / claiming
- **COMPONENT:** `MissionScheduler._dispatch` + `MissionRuntime.assign`
- **CLAIM:** `assign()` is correctly conditional (`WHERE status='created'`, returns rowCount; second claim rejected). But `_dispatch` DISCARDS the rowCount: `await this._missionRuntime.assign(mission.mission_id, workerName)` then unconditionally `await this._missionRuntime.start(mission.mission_id)`. `start()` only requires `status='assigned'` — which is true when ANOTHER scheduler holds the claim. Result: scheduler B can start(), dispatch, and complete/fail scheduler A's claimed mission → double execution with both workers emitting downstream events. The in-code comment "the assignment can never be stolen by a concurrent scheduler" is true of `assign()` in isolation and false of the `_dispatch` sequence.
- **EVIDENCE:** `_dispatch` lines ~215-220 (no rowCount check); `assign()` returns `result.rowCount || 0` (unused by caller); `start()` — `WHERE status='assigned'`.
- **CLASSIFICATION:** REFACTOR (patch P-09b: check rowCount === 1, else abort dispatch and drop from `_processing`)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** claim-then-act is not atomic from the scheduler's side; stale-worker takeover has no fencing token (see R-14).
- **AFFECTS AGENTS:** 11, 06 (double-execution is an adversarial failure class).

### R-14 — no fencing token on reclaim; stale worker can overwrite

- **DOMAIN:** leases / stale-worker takeover
- **COMPONENT:** `MissionRuntime.reapExpiredLeases()` + `complete()`/`fail()`
- **CLAIM:** `reapExpiredLeases()` resets expired `running`/`assigned` missions to `created` and clears holder fields, but there is NO fencing token: a stale worker that still believes it holds the mission can later call `complete()` — which only checks `status='running'`. If the mission was re-claimed and re-dispatched in the meantime, the stale completion SUCCEEDS and overwrites the new holder's result (or vice versa). `ping_missions` has no token/monotonic-epoch column.
- **EVIDENCE:** `reapExpiredLeases` SQL (no token); `complete()` — `WHERE status='running'` only; DDL column list has no token/epoch field.
- **CLASSIFICATION:** REFACTOR (patch P-09c: fencing token column, set at assign, required on complete/fail/failWithRetry, cleared on reap)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** stale-worker takeover is detection without fencing — the classic split-brain write.
- **AFFECTS AGENTS:** 11, 06.

### R-15 — retry_pending missions loop forever on the success path; `reclaimRetryPending()` is a phantom

- **DOMAIN:** scheduling / retry
- **COMPONENT:** `MissionRuntime.failWithRetry` + `getPending` + `MissionScheduler._dispatch`
- **CLAIM:** `failWithRetry`'s docstring says retry_pending missions are "invisible until `retry_at` is reached and `reclaimRetryPending()` moves them back to `created`". That function DOES NOT EXIST anywhere in the repo (grep: single hit, the comment itself). Instead `getPending()` returns `retry_pending` rows directly once `retry_at <= NOW()`. The dispatch sequence then fails closed at every step EXCEPT the one that matters: `assign()` needs `created` → 0 rows (ignored); `start()` needs `assigned` → 0 rows; **the worker still runs** (`WorkerRuntime.dispatch` is called unconditionally — downstream side-effect events ARE emitted); `complete()` needs `running` → 0 rows, silent no-op. The mission stays `retry_pending` with `retry_at` in the past, so EVERY poll re-dispatches it: an infinite loop of worker executions with no state progress and duplicate downstream events every 5s, until a failure happens to push it to `failed` (the exhaustion branch is the only one that matches `retry_pending` status). Secondary doc drift: the same docstring claims "getPending() only returns `created` missions" — false.
- **EVIDENCE:** grep `reclaimRetryPending` → 1 hit (comment); `getPending` SQL includes the retry_pending clause; `_dispatch` sequence verified; `failWithRetry` retry branch `WHERE status IN ('running','assigned')` (excludes retry_pending) vs exhaustion branch `IN ('running','assigned','retry_pending')`.
- **CLASSIFICATION:** REFACTOR (patch P-09d: implement the missing reclaim — move due `retry_pending` → `created` atomically in `getPending`'s stead, or add the real `reclaimRetryPending()`; either way the docstring's intended design, not a new authority)
- **CONFIDENCE:** 0.9 (code-path verified; live loop not observed running — gateway may not be executing the scheduler in this environment)
- **BROKEN BOUNDARY:** the retry state machine has an unreachable intended transition and a live infinite re-dispatch loop.
- **AFFECTS AGENTS:** 06 (failure-harness must cover this), 02 (MC would show a stuck retry_pending mission with ever-growing downstream duplicates), 01 (duplicate downstream events pollute the event log).

### R-16 — multi-match dispatch: all matching workers run, only the last result survives

- **DOMAIN:** worker-dispatch
- **COMPONENT:** `WorkerRuntime.dispatch(event)`
- **CLAIM:** The `for` loop awaits EVERY registered worker whose `eventTypes` includes the event type and which has capacity, sequentially, keeping only `lastResult`. With the current registration table each business event type matches exactly one worker (observation is the sole registrant for BUSINESS_EVENTS; pipeline events are 1:1), so this is latent — but any future overlapping registration silently fans out with last-wins semantics and no aggregation. The scheduler cannot tell that N workers ran.
- **EVIDENCE:** `dispatch()` loop lines 75-105; registration table in `registerCanonicalWorkers` (currently 1:1 per event type — verified by reading the BUSINESS_EVENTS array and per-worker eventTypes).
- **CLASSIFICATION:** REFACTOR (patch P-09e: define and enforce single-winner-or-aggregate policy in the adapter contract, §4)
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** dispatch cardinality is implicit.
- **AFFECTS AGENTS:** 10.

### R-17 — DLQ replay has no canonical mission-replay path

- **DOMAIN:** dead-letter
- **COMPONENT:** `DeadLetterAuthority.replayDeadLetter(deadLetterId, replayFn)`
- **CLAIM:** `replayDeadLetter` exists but has ZERO live callers; the `replayFn` is entirely caller-supplied. There is no canonical function that turns a dead mission letter back into a `ping_missions` row (which would need `MissionRuntime.create` with the dead letter's payload plus a causation link to the dead letter). Dead missions are therefore operator-terminal today: queryable and witnessed, but only replayable by hand-rolled scripts.
- **EVIDENCE:** grep `replayDeadLetter` → definition only; scheduler `_failMission` writes the DL with `mission_id` + full payload + `correlation_id`/`causation_id` — everything a replay needs except the function.
- **CLASSIFICATION:** REFACTOR (patch P-09f: a `replayMissionDeadLetter(deadLetterId)` adapter — NOT a new authority — that calls the existing `replayDeadLetter` with a replayFn closing over the existing `MissionRuntime.create`)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** the failure pipeline's terminal state has no return path.
- **DEPENDENCIES:** DeadLetterAuthority, MissionRuntime.
- **AFFECTS AGENTS:** 06, 02 (MC "replay" button would need this).

---

## 4. The common execution boundary: design

**Non-goal (binding):** no new canonical mission, scheduler, or execution-router authority. The boundary is an ADAPTER in the exact style of `priority_boundary.js`: "ADAPTER ONLY. RULE: No new business logic in this module. It maps values, nothing else." It sits between `MissionScheduler._dispatch` and worker implementations (JS in-process today, Python HTTP-poll as the preserved alternate), and between worker results and `MissionRuntime` completion.

### 4.1 Placement

```
MissionScheduler._dispatch(mission)
  → ExecutionAdapter.execute(envelope)          ← THE BOUNDARY (new, adapter-only)
      → WorkerRuntime.dispatch(event)           ← unchanged canonical decider (JS path)
      → PythonBridge.dispatch(event)            ← preserved alternate (HTTP poll model)
      → normalize(result) → ResultEnvelope
  → scheduler acts on ResultEnvelope: complete | failWithRetry | terminal-reject | busy-defer
```

The adapter owns NO state, NO tables, NO routing decisions beyond what `WorkerRuntime.dispatch` already decides. It is a pure envelope translator + result normalizer + evidence checker. `MISSION_WORKER_MAP` stays a label; `WorkerRuntime.dispatch` stays the decider.

### 4.2 Adapter contract — inputs (DispatchEnvelope)

Built by the scheduler from the mission row + payload (all fields already exist today):

| Field | Type | Source | Required |
|---|---|---|---|
| `mission_id` | string | `mission.mission_id` (sha256 idempotency key) | yes |
| `mission_type` | string | `mission.mission_type` | yes |
| `event_id` | string | `payload.event_id \|\| mission_id` | yes |
| `event_type` | string | `payload.event_type \|\| mission_type` — the ORIGINAL business event; dispatch key | yes |
| `namespace` | string | `payload.namespace` (bridge-resolved; never re-defaulted in workers) | yes |
| `correlation_id` | string | `payload.correlation_id \|\| event_id` | yes |
| `causation_id` | string \| null | `payload.event_id` | no |
| `payload` | object | `payload.payload \|\| payload` — unwrapped business payload | yes |
| `priority` | int 0-3 | `mission.priority` (canonical scale, persisted) | yes |
| `lease` | object | `{ holder: assigned_to, expires_at: lease_until, fencing_token }` — after P-09a/c | yes |
| `attempt` | int | `mission.retries + 1` | yes |
| `metadata` | object | `{ mission_type, assigned_to, canonical_hash, confidence }` | no |

Idempotency rule (already true, now contractual): `mission_id` is deterministic per triggering event; workers MUST be idempotent on `event_id` (UnifiedEventRuntime's content-hash IDs make re-emission safe; `ON CONFLICT DO NOTHING` on missions; downstream dedupe by event_id).

### 4.3 Adapter contract — worker implementation surface (IWorkerHandle)

Both backends implement the same surface:

```
handle(event: DispatchEnvelope) -> Promise<ResultEnvelope>
```

`ResultEnvelope` (extends the existing de-facto `{status:'ok'|...}` convention):

| Field | Type | Meaning |
|---|---|---|
| `status` | `'ok' \| 'failed' \| 'rejected' \| 'busy'` | terminal outcome of THIS attempt |
| `evidence` | object | evidence bundle (see §4.4); on `ok`, SHOULD include emitted event ids |
| `error` | string | required when `failed`; machine-readable `code` encouraged |
| `reason` | string | required when `rejected` (deliberate refusal, e.g. `unverified_replay:<cause>`) |

Backend mappings:
- **JS path:** `WorkerRuntime.dispatch(event)` already returns worker results; the adapter normalizes: thrown error → `{status:'failed', error}`; `null`/no-match → `{status:'failed', error:'no worker matched event_type=...'}` (current phantom-complete prevention, kept); `{status:'rejected'}` passes through (WitnessWorker already returns this).
- **Python path:** the preserved `worker_runtime.py` loop becomes a `PythonBridge` implementing `handle()`: it translates the envelope to the Python `Event` dataclass (fixing R-08's `metadata=None` drop — correlation_id/causation_id/namespace travel top-level), dispatches via `kernel.event_dispatcher`, and maps return/exception to `ResultEnvelope`. Vocabulary shim maps Python event names → canonical (`CLAIM_GENERATED`→`CLAIM_CREATED`, etc. — table to be completed after the pending header reads). The Python backend MUST NOT compete for the same missions: it consumes via the adapter's claim (P-09a holder binding gives it a real lease) or stays on its `/events/unprocessed` cursor — never both for the same event stream.

### 4.4 Evidence obligations (per worker hop — codifies what BaseWorker._emit already does)

These are contractual, backend-independent, and checkable:

1. **Namespace preservation:** inherit `envelope.namespace` on every downstream emission. Workers never default to `core::system` (owned solely by `UnifiedEventRuntime.emit`).
2. **Causal linkage:** downstream emissions carry `correlation_id` (inherited, never regenerated) and `causation_id` = the triggering `event_id`.
3. **Confidence semantics:** explicit value → preserved exactly; else inherited non-null → preserved with `confidence_source: 'inherited'`; else `null`. Canonical check: `Object.hasOwnProperty(options, 'confidence')`.
4. **Emit failure is worker failure:** a non-`ok` emit MUST surface as `{status:'failed'}` or a throw — never swallowed (ProjectionWorker's Qdrant `try/catch` that only logs is the documented exception: Qdrant is a side projection, the canonical `PROJECTION_CREATED` event already emitted).
5. **No fabrication:** the ReplayWorker authority-bundle rule generalizes — every evidence field derives from an actual value (triggering event fields, engine results, fixed authority identities); absent values are omitted, never defaulted. `verified`-class claims require the verifying engine's verdict, never a stub.
6. **Result evidence on `ok`:** SHOULD include `{ emitted_event_ids: [...], authority, provider }` so `MissionRuntime.getTrace()` can close the loop without re-querying.

### 4.5 Failure semantics (adapter → scheduler)

| Adapter outcome | Scheduler action (existing machinery, no new authority) |
|---|---|
| `{status:'ok'}` | `MissionRuntime.complete(missionId, {worker, completed_at, evidence_ref})` — conditional on `running` + fencing token (after P-09c) |
| `{status:'failed'}` or throw | `_failMission` → `failWithRetry` (backoff, max 3) → `retry_pending`; on exhaustion → `DeadLetterAuthority.recordDeadLetter` (witnessed) |
| `{status:'rejected', reason}` | **Terminal, no retry, no DLQ.** `complete()` with `{rejected: true, reason}` — refusal is a correct outcome (WitnessWorker precedent: it emits `WITNESS_REJECTED` and returns `rejected`; today the scheduler completes it, which is correct but implicit — the adapter makes it explicit). |
| `{status:'busy'}` (NEW — patch P-09g) | Leave the mission `assigned`; do NOT complete/fail; keep in `_processing` so Arrow 0 renews the lease; re-poll next cycle. Fixes R-04's silent capacity skip (today a full worker looks like a missing worker → spurious failWithRetry). |
| dispatch returns null (no worker matched event_type) | Keep current behavior: `_failMission` (phantom-complete prevention) — but log at `skipped` honesty: rename the stat to `no_match_failed`. |

Retry/backoff/DLQ policy stays owned by `MissionScheduler` (constructor `retryPolicy`); the adapter never retries internally.

### 4.6 Lease interaction through the boundary

- The adapter RECEIVES the lease (`holder`, `expires_at`, `fencing_token`) in the envelope but never mints or extends it — renewal stays Arrow 0 in the scheduler, reclaim stays `reapExpiredLeases()` in MissionRuntime.
- After P-09a: `renewLease(missionId, holder)` — adapter passes `envelope.lease.holder` through; renewal SQL gains `AND assigned_to = $holder`.
- After P-09c: `complete`/`fail`/`failWithRetry` require the fencing token; the adapter threads `envelope.lease.fencing_token` into the completion call. Stale workers' completions fail closed (rowCount 0 → adapter returns `{status:'failed', error:'fencing_token_mismatch'}` → scheduler treats as already-handled, does not re-complete).
- Worker implementations never see raw SQL; they see the envelope. The Python bridge likewise receives holder+token and returns them opaquely.

---

## 5. Evidence-backed patch list (no new authorities)

| ID | Patch | Evidence | Touches |
|---|---|---|---|
| P-09a | Holder-bound lease renewal: `renewLease(missionId, holder, secs)` with `AND assigned_to = $holder`; scheduler Arrow 0 passes the holder it claimed as. | R-12: SQL binds nothing; Arrow 0 passes only missionId. | `mission_runtime.js`, `mission_scheduler.js`, `test_lease_renewal.js` mock |
| P-09b | `_dispatch` aborts when `assign()` rowCount !== 1 (drop from `_processing`, do not `start`/dispatch). | R-13: rowCount discarded; `start()` only checks `assigned`. | `mission_scheduler.js` |
| P-09c | Fencing token: `fencing_token` column set at `assign()` (uuid), required on `complete`/`fail`/`failWithRetry`, cleared on `reapExpiredLeases()`. | R-14: reclaim has no fencing; `complete()` only checks status. | `mission_runtime.js` DDL + 5 methods |
| P-09d | Implement the missing reclaim: due `retry_pending` → `created` atomically (the documented `reclaimRetryPending()`), called in `_poll` before dispatch; fix the two docstring drifts. | R-15: phantom function; infinite re-dispatch loop on success path. | `mission_runtime.js`, `mission_scheduler.js` |
| P-09e | Dispatch cardinality policy: single-winner (first registered match, deterministic) OR all-match with aggregated `ResultEnvelope[]`; document in the DOC-CONTRACT. | R-16: all-match loop, last-result-wins. | `worker_runtime.js` (+ contract §4.5) |
| P-09f | Canonical mission-replay adapter: `replayMissionDeadLetter(deadLetterId)` calling existing `replayDeadLetter` with a replayFn that re-creates via `MissionRuntime.create` (payload preserved, causation → dead letter). | R-17: zero live callers; all replay inputs already stored. | new adapter module (adapter-only) + `dead_letter_authority.js` untouched |
| P-09g | `{status:'busy'}`: WorkerRuntime returns busy when all matching workers are at capacity; scheduler defers instead of failWithRetry. | R-04: capacity skip is silent; busy masquerades as missing. | `worker_runtime.js`, `mission_scheduler.js` |
| P-09h | Python vocabulary + metadata adapter (`CLAIM_GENERATED`→`CLAIM_CREATED` et al.; stop dropping `metadata`). | R-08: `metadata=None`; vocabulary drift. | `workers/worker_runtime.py` `event_from_api` + a vocabulary map module |
| P-09i | Remove/verify the stale `MISSION_WORKER_MAP` import in `event_to_mission_bridge.js`; drop the dead `constitutional_time_authority` require in `MissionRuntime.create`; remove dead `_poll`/`_gatewayUrl` in `worker_runtime.js` (or document as intentionally retained). | R-06, R-02, R-04. | three files, deletions only |

Out of scope for this lane (flagged, not designed): Orca-vs-spine convergence (KEEP-DISABLED per gateway contract — needs Nolan/explicit ruling); `BackgroundWorkers`/`wiring.js` alternate bootstrap (unused by `gateway_runtime.js` — candidate for archive per the "archive instead of delete" rule); Mission Control UI replay button (needs P-09f first; Agent 02's lane).

---

## 6. Open questions for parent / other agents

1. **Orca vs live spine (needs Nolan):** `ExecutionEngine` is instantiated but neutered (`discoverOllama: false`) with an explicit KEEP-DISABLED contract citing "Orca-vs-live-spine convergence decision" as pending. This lane does not decide it — but every patch above assumes the JS mission spine is the survivor. If Orca is revived, R-04/R-06 (single decider) must be re-audited.
2. **Python runtime future:** preserved-but-drifting. Recommend: keep as the alternate backend behind the adapter (P-09h) OR formally mothball (archive, don't delete). Do not let it silently share the live event stream — the metadata drop (R-08) is a privacy-boundary risk.
3. **Who owns `retryPolicy` tuning** (max_attempts=3, backoff 5s): currently a scheduler constructor default; gateway passes nothing (uses default). Fine, but it should be a config value, not a code default, before MC exposes it.
4. **swarm-08 F-01** ("competing mission authority"): this investigation finds exactly ONE live mission authority (`MissionRuntime` + `ping_missions`; the "12 dead mission implementations" it claims to replace are not on the live path). The competition is Orca (disabled) and the Python runtime (no mission concept) — neither is a live mission authority. F-01 appears addressed by the current code; recommend closing with this evidence.
5. **Pending:** Python worker Consumes/Produces headers for 5 workers (bridge stalled mid-read); the structural findings don't depend on it, but the P-09h vocabulary table does.

## 7. Files produced

- This report: `~/workspace/tenanos-wave/swarm-09/AGENT09-EXECUTION-BOUNDARY.md`
- Ledger summary: appended to `~/workspace/tenanos-wave/WAVE-LEDGER.md` under `## AGENT 09 findings`
