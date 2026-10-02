# LANE-T  -  Temporal Durability Auditor: Read-Only Audit + Kill/Restart Drill Design

**Date:** 2026-09-19 (MDT) · **Operator:** LANE-T subagent · **Mode:** strictly read-only (no edits, commits, merges, DB writes, restarts, secret reads, installs). No mutations performed.

**Repo inspected:** `/home/nolan/ping`, checked out branch `feature/approval-effect-identity` at `88c9651be` (LOCAL_BRANCH; this is the working checkout, not main). Remote refs consulted: `origin/feature/temporal-durable-execution`. Live runtime: Pig docker containers `ping-temporal-dev`, `ping-gateway`.

**Backlog premise honored:** the falsified-premises section of `convergence-backlog-2026-09-19.md` was read first. Nothing in this audit re-opens AcquisitionManager / ConstitutionalEventStore (PHANTOM), EventRepository (LEGACY_UNREACHABLE), or IEventAuthority (DORMANT). Related hazard flagged in §4: `gateway/temporal_authority.js` is a constitutional "time semantics" authority (WHEN not WHAT), NOT the Temporal.io workflow engine. The name collision is a confusion risk for any future reader; it is not a competing Temporal.io implementation.

**Overlap note:** `agent-f-temporal-orca-approval.md` (2026-09-18/19) covered overlapping ground. Where this audit re-checked a claim, the result is stated; one correction is recorded in §1 (declared SDK in gateway/package.json exists; the prior report said it did not).

---

## 1. Temporal implementation audit

### 1.1 Installed SDK: declared, not installed

| Claim source | What it says | Verified state |
|---|---|---|
| `gateway/package.json` (lines 26-28) | `@temporalio/activity`, `@temporalio/client`, `@temporalio/worker`: `^1.8.0` | **DECLARED since commit d596aa596** ("feat(kernel): freeze constitutional replay kernel", old). |
| `gateway/node_modules` | SDK actually installed | **ABSENT.** `node_modules` exists (body-parser, etc.) but no `@temporalio` directory. `find` across the repo (including untracked worktrees) finds no `@temporalio` install anywhere. |
| Prior recon (agent-f) reported 1.21.1 installed in `/home/nolan/worktrees/ping-codex-convergence` | Installed copy | **Unreproducible.** Both sibling worktree paths it cited no longer exist on disk (2026-09-19). No installed SDK copy is verifiable anywhere today. |

Consequence: **every `require('@temporalio/...')` in the repo would throw MODULE_NOT_FOUND at runtime today.** Both code integrations below are load-broken until the SDK is actually installed. No TypeScript types ship for the JS code paths (repo is plain JS; `@temporalio` 1.x ships its own TS types, but nothing imports them because nothing can import the package).

### 1.2 Two disjoint, unproven integrations (nothing executed, ever)

**Integration A  -  `ping-runtime/temporal/` (LOCAL_BRANCH, commits 1fcfa79d2 + f250c19ca).** This is the "strongest" in the sense of being a coherent workflow design closest to the constitutional split:
- `workflows/mission_workflow.js` (122 lines): `missionExecution` workflow, `approvalSignal` signal, `approvalStatusQuery` query, approval wait via `condition(...)` with a 1-hour inline timeout, `proxyActivities` retryPolicy (initialInterval 1s, max 30s, backoff 2, maxAttempts 3, 5-min startToCloseTimeout).
- `activities/mission_activities.js` (85 lines): `executeWorkOrder` and `recordMissionOutcome`  -  **explicit stubs returning hardcoded results** ("Draft generated", `recorded: true`). Production wiring to ExternalAgentAdapter/MissionRuntime is commented-out TODO.
- `index.js`: re-export shim. `temporal_integration.test.js`: **file-existence and stub-shape assertions only**; never contacts a server, never runs a workflow.
- **Replay bug at this branch:** the workflow calls `new Date().toISOString()` in the signal handler and return paths (non-deterministic; breaks Temporal replay). Commit `57156ecf2` fixes this (Temporal-safe time) but lives only on `origin/feature/temporal-durable-execution` (PUBLIC_GITHUB), **not in LOCAL_BRANCH**. HEAD here is still the broken copy.
- No worker code, no client code, no schedule/start call site, no task-queue registration. DECLARED / non-executable.

**Integration B  -  `gateway/` Temporal stack (LOCAL_BRANCH).**
- `gateway/temporal_runtime.js` (141 lines): `TemporalRuntime` lifecycle wrapper (connection, client, worker). Wired into `gateway/bootstrap/wiring.js` DI container (`temporalRuntime`, `temporalSchedulerProvider`, `schedulerPort`) and listed in `lifecycle.js` START_ORDER/SHUTDOWN_ORDER.
- **Broken on three independent counts:**
  1. `TemporalRuntime` exposes `initialize()` and `startWorker()`, but `Lifecycle.start()` only calls `service.start()`. No `start()` method exists, so even if the wiring path booted, the Temporal worker would be silently skipped (not started, no error).
  2. `wiring.js:140` sets `workflowsPath` to `gateway/temporal_workflows.js`, which **does not exist** (verified: MISSING). A worker creation would fail.
  3. `TemporalSchedulerProvider.schedule()` starts a workflow named `'ConstitutionalWorkflow'`; that string appears **only** in the provider file. No workflow definition for it exists anywhere.
- `gateway/activities/*.activity.js` (6 files: mission, replay, repository, compiler, knowledge, reflection): thin wrappers that delegate to authorities, so they honor "activities invoke authorities." Boundary concern (§4): `repository.activity.js` and `replay.activity.js` put the canonical event repository and replay machinery behind Temporal activities, which smears the PING/Temporal truth boundary in the wrong direction.
- `test_temporal_audit.js`: a **constitutional time audit** (grep for `Date.now`/`setInterval` in kernel files). Unrelated to Temporal.io durability; misleading filename.
- The **live** gateway bootstrap (`gateway/bootstrap/gateway_runtime.js`) contains **zero** "temporal" references. Integration B is not in the deployed composition; the DI wiring path it depends on is not the live bootstrap path. DECLARED / non-executable / unreachable.

**Worker-lifecycle contract tests** (commits `08c3036d9`, `2191cc644`) exist only on branch `codex/context-workorder-convergence`, also unreachable from the live path.

### 1.3 Execution evidence: none, anywhere

| Namespace | Check | Result |
|---|---|---|
| LIVE_RUNTIME | `ping-temporal-dev` container (`temporalio/temporal`, server 1.32.0 / CLI 1.9.1), up 26h, created 2026-09-17T23:48, listening on 127.0.0.1:7233, UI on :8233, sqlite `/data/temporal.db` | Running and reachable. |
| LIVE_RUNTIME | `temporal workflow count --namespace default` (read-only, inside container) | **Total: 0.** Only namespace is `default` (24h retention). No workflow of any type has ever executed on this server instance. Caveat: the server was created 2026-09-17; an earlier container recreation would have reset history, but there is no older evidence either. |
| LIVE_RUNTIME | `docker logs ping-gateway` (full log) grepped for "temporal" | **Zero matches.** The deployed gateway never touches Temporal. |
| LOCAL_BRANCH / PUBLIC_GITHUB | schedule/start call sites for any Temporal workflow | None exist. |
| LIVE_RUNTIME | Task-queue pollers / workers registered | None observed (no workers started; Integration A has no worker code, Integration B's worker path is dead). |

**Verdict on the strongest implementation:** Integration A (`ping-runtime/temporal/mission_workflow.js`) is the strongest *design* (mission_id as workflowId, approval signal, split-aware comments) but is stub-only, SDK-less, replay-unsafe at this branch, and has never executed. Integration B is more "wired" on paper but is triply broken and not in the live composition. **No workflow has ever executed against a real Temporal service. The live Temporal dev server is infrastructure with zero usage.**

---

## 2. Polling loop inventory and classification

Sixteen `setInterval`-driven loops found in `ping-runtime/`, `gateway/` (test/spec/eval files excluded). Classification per the constitutional split (PING: semantic truth, authorization, identity, business policy, evidence; Temporal: workflow history, durable timers, activity scheduling, heartbeats, durable retry, workflow recovery; connectors: narrow protocol retry; DB: serialization retry).

### Orchestration polling  -  Temporal candidates (split violation if PING-owned)

| Loop | Location | Interval | What it does | Split verdict |
|---|---|---|---|---|
| MissionScheduler poll | `ping-runtime/orchestration/mission_scheduler.js:125` | 5s | Arrow 0: `renewLease()` for in-flight missions. Arrow 1: `reapExpiredLeases()` (reset expired `assigned/running` missions to `created`). Arrow 2: dispatch pending to workers. Failures route to `_failMission` → `failWithRetry` (max_attempts 3, backoff 5s) → dead-letter. **LIVE** (deployed gateway logs show it started). | **VIOLATION.** Home-grown durability: lease renewal = heartbeats; lease reaping = workflow recovery; `failWithRetry`/backoff = durable retry; dispatch loop = activity scheduling. All Temporal-owned per the split. |
| Event outbox publisher | `gateway/event_outbox.js:99` | 1s | Polls `event_outbox` table and publishes unprocessed events. The transactional outbox *write* is legitimate PING/DB discipline; the 1s polling publisher is orchestration scheduling. | Partial violation (delivery scheduling). |
| Mission event bus processor | `gateway/mission_event_bus.js:79` | 1s | Polls `mission_events` for unprocessed rows and processes them. | VIOLATION (orchestration scheduling). |
| Desktop runtime heartbeat | `gateway/constitutional_desktop_runtime.js:341` | interval | Heartbeat timer. | VIOLATION (heartbeats are Temporal-owned). |

### External acquisition polling  -  stays PING/connector-owned (not Temporal)

| Loop | Location | What it does |
|---|---|---|
| Continuous acquisition | `gateway/continuous_acquisition.js:87` | Polls tracked GitHub repos via acquisition authority. Connector-owned protocol retry; acquisition cadence is business policy. |
| GitHub release watcher | `gateway/github_release_watcher.js:264` | Polls GitHub for releases. Same. |

### Projection refresh  -  PING-owned (not Temporal)

| Loop | Location | What it does |
|---|---|---|
| Materialized views refresh | `gateway/materialized_views.js:113` | Refreshes ControlCenter materialized views. Projections are PING-owned; DB owns serialization retry. |
| Embedding queue | `gateway/archive/qdrant_integration.js:272` | Drains embedding work queue into Qdrant. Projection refresh; not Temporal. |

### Bridge / legacy polling  -  migration shim, should be bounded not perpetual

| Loop | Location | Interval | What it does |
|---|---|---|---|
| EventBridge | `ping-runtime/events/event_bridge.js:86` | 5s, batch 50 | Bridges legacy `repository_events` → canonical `ping_events` and `canonical_events` → canonical store, cursor-based. **LIVE** (deployed gateway logs show it running; currently bridging 0 rows). |

This is a legacy-shim loop running forever in production. It should be a bounded backfill with an end state, not a perpetual 5s poll. Not an orchestration candidate; treat as legacy to retire.

### Health / telemetry polling  -  stays (operational, not orchestration)

- `gateway/telemetry_subsystem.js:111` (metrics collection), `gateway/circuit_breaker.js:110` (half-open probe), `gateway/constitutional_watchers.js:247` (watchers emitting events).

### Presentation polling  -  stays

- `gateway/control_center_subscription.js:48` (5s WebSocket fallback push for the UI dashboard).

### Background analytic loops  -  PING business loops, not orchestration polling

- `gateway/self_improvement_loop.js:76`, `gateway/continuous_background_analyst.js:86`, `gateway/continuous_reflection_loop.js:62`. These are periodic business/analytic passes; they are work *content*, and if any of them needs crash-safe continuation they should be *driven by* Temporal workflows, not reimplemented as timers. Candidate for workflow-driven scheduling in the future, but not a split violation today.

### Competing durability mechanism (not a poll, but relevant)

- `gateway/bullmq_adapter.js` exists but is **unreferenced by any code** (no `require` anywhere). BullMQ is DORMANT: declared in `gateway/package.json`, never wired. It must not become a second durability scheduler alongside Temporal; one or the other must be chosen before any production durability work begins.

---

## 3. What currently violates the PING/Temporal responsibility split

Ranked by leverage. All of these are PING-side re-implementations of mechanics the split assigns to Temporal.

1. **MissionScheduler is a hand-rolled workflow engine (highest leverage).** `mission_scheduler.js` + `mission_runtime.js` implement: lease-based claiming (`assign`/`start`/`renewLease`), crash recovery via lease reaping (`reapExpiredLeases` resets to `created`), durable retry with backoff (`failWithRetry`, `retry_at`, max_attempts), dead-letter routing, and capacity-limited dispatch. This is the exact responsibility set the split gives Temporal (workflow history, activity scheduling, heartbeats, durable retry, workflow recovery). It is also **the live production durability path** (`ping-gateway:devin-boundary2` logs show it started and running). Any Temporal adoption must converge this path, not run beside it: two durability engines on the same `ping_missions` table will double-dispatch. Migration order matters: Temporal becomes the scheduler; the scheduler's lease/retry logic becomes the harvested mechanism inside Temporal activities/workflows, then the polling loop is retired.

2. **Heartbeat ownership.** `constitutional_desktop_runtime.js` runs its own heartbeat interval. Per the split, heartbeats are Temporal-owned (activity heartbeats with heartbeat timeouts). The desktop runtime should heartbeat through a Temporal activity, not a private timer.

3. **Delivery scheduling via polling.** The 1s outbox publisher and 1s mission-event-bus processor are PING-side scheduling loops. Keep the transactional outbox write (PING/DB discipline), but delivery should move to Temporal durable timers / scheduled workflows, not `setInterval`.

4. **Boundary smear in `gateway/activities/`.** `repository.activity.js` and `replay.activity.js` expose the canonical event repository and replay engine *as* Temporal activities. The split says PING owns semantic truth and evidence; activities must invoke authorities, not become the path by which Temporal mints or rewrites truth. Direction must be: Temporal schedules and retries; PING authorities decide and emit; the activity reports the observed outcome back. Approval-effect identity (proposed → approved → attempted → observed → verified) is the contract that must sit in the activity boundary: an activity attempts an effect exactly once per logical effect identity and returns the observed PING-emitted event.

5. **BullMQ as a dormant second scheduler.** Unreferenced today, but its presence in `package.json` plus a complete adapter is a standing invitation to build a parallel durability system. Decide: Temporal or BullMQ for durable scheduling. The split already answers: Temporal.

---

## 4. Drill design: smallest real workflow + kill/restart drills (NOT executed)

**Design intent:** the smallest workflow that proves the split end to end. It reuses the strongest existing design (Integration A, `missionExecution`) hardened for replay, wired to real PING authorities through effect-identity-guarded activities, executed against the live `ping-temporal-dev` server.

### 4.1 Preconditions (setup, still read-only until an executor is authorized)

- P0. Install `@temporalio` 1.x (pin exact, e.g. 1.21.1) into the execution environment; fix Integration A's `require('@temporalio/workflow')` load path.
- P1. Apply the Temporal-safe-time fix (from `origin/feature/temporal-durable-execution`) and replace `condition()` + inline 3600s timeout with a **durable timer** (`sleep`) plus signal; `condition` with a raw ms timeout is not the durable approval-wait primitive.
- P2. Replace stub activities with real ones: `executeWorkOrder` delegates to the approval-effect-identity gate (from `feature/approval-effect-identity`) and ExternalAgentAdapter; `recordMissionOutcome` invokes MissionRuntime and returns the canonical `event_id` it emitted. Activities take `(mission_id, effect_identity)` and are idempotent: re-execution with the same effect identity returns the already-recorded outcome instead of doing the work twice.
- P3. Register a worker on task queue `ping-mission-drill`, start workflows by `workflowId = mission_id`.
- P4. Baseline evidence captured BEFORE the drill: `temporal workflow count` = 0 (already verified 2026-09-19), `ping_missions` and `ping_events` snapshot for the drill mission ids, dev server history dir state.

### 4.2 The workflow under test (W0: mission-with-approval)

```
missionExecutionV2(mission_id, capability, input, constraints):
  1. activity executeWorkOrder(mission_id, effect_identity)   # idempotent; returns requiresApproval
  2. if requiresApproval:
       await signal(approval) OR durable timer expires (approval timeout)
     # signal carries {approved, decidedBy}; timeout path marks expired
  3. activity recordMissionOutcome(mission_id, status, effect_identity)  # PING emits canonical event; returns event_id
  4. return { mission_id, status, event_id, approval }
```

### 4.3 Kill points, steps, assertions, expected evidence

**Drill D1: worker killed mid-activity (no duplicate logical work)**
- Steps: start W0 (capability that does NOT require approval). After `executeWorkOrder` begins (observe `ActivityTaskStarted` in history), `kill -9` the worker process mid-activity. Restart worker. Let Temporal retry the activity to completion.
- Assertions: (a) exactly ONE `MISSION_COMPLETED` canonical event exists in `ping_events` for `mission_id`; (b) `recordMissionOutcome` executed once logically (second activity attempt with the same effect identity short-circuits on the existing record); (c) workflow history shows `ActivityTaskFailed` (worker lost) then `ActivityTaskStarted` retry, then single completion.
- Expected evidence: workflow history JSON (`temporal workflow show`), one `ping_events` row with the effect identity, drill log timestamps bracketing the kill.

**Drill D2: worker killed during approval wait (durable timer + signal survive restart)**
- Steps: start W0 with a capability requiring approval (`email.send` per the stub contract). Wait until workflow is blocked on the approval signal. Kill worker. Restart worker. Deliver the `approval` signal (approved). Workflow completes.
- Assertions: (a) the approval wait survived the kill with no polling loop running anywhere (prove by `ps`/logs: no process was polling); (b) signal delivered after restart is received exactly once; (c) approval decision, decider, and timestamp are in history and in the final canonical event.
- Expected evidence: history shows `WorkflowTask` replay from history on restart, `SignalReceived` once, `TimerFired` absent (approved before timeout).

**Drill D3: crash after activity success, before workflow completes (no lost authorized work)**
- Steps: start W0 (no approval). Arrange `recordMissionOutcome` to succeed at the PING layer but kill the worker before it returns to the workflow. Restart worker. Retry of the activity must detect the already-emitted canonical event via effect identity and return it without emitting a second event.
- Assertions: (a) exactly one canonical event for the mission; (b) workflow completes with `status: completed` and the same `event_id`; (c) mission row ends in terminal state, not stuck in `running`.
- Expected evidence: `ping_events` count = 1 for the mission; history shows second activity attempt completing via idempotent short-circuit.

**Drill D4: Temporal server restart (history durability)**
- Steps: with W0 running (mid approval wait), restart the `ping-temporal-dev` container (requires Nolan authorization; this is the one drill step that touches live infra and is OUT of scope for an unattended executor). Reconnect worker; signal approval; workflow completes.
- Assertions: (a) workflow history survived (sqlite `/data/temporal.db` durability); (b) no state was held only in worker memory (the current Integration A keeps `approvalState` only in workflow memory, which is fine because Temporal replays it from history; the drill proves it).
- Expected evidence: history intact across container restart; completion after reconnect.

**Drill D5: duplicate start with same workflowId (correct attempt semantics)**
- Steps: start W0 with `workflowId = mission_id`; immediately attempt to start it again with the same id (simulating a double-submit from the gateway).
- Assertions: (a) second start is rejected (`WorkflowExecutionAlreadyStarted`) or returns the existing handle per `WorkflowIdReusePolicy`; (b) only one workflow history exists; (c) exactly one canonical event results.
- Expected evidence: client error/handle for the duplicate; single history; single event row.

**Drill D6: authorization denial is non-retryable (attempt semantics)**
- Steps: start W0 with a capability the (real) authorization gate denies. The activity must throw a non-retryable `ApplicationFailure` (not a generic error that the 3-attempt retry policy would burn).
- Assertions: (a) exactly 1 activity attempt in history (no pointless retries on a deterministic denial); (b) mission ends `failed` with the denial reason; (c) no dead-letter entry is created for a policy denial (DLQ is for exhausted transient failures, not denials).
- Expected evidence: history shows single `ActivityTaskFailed` with `ApplicationFailureInfo{nonRetryable: true}`; mission row terminal.

**Cross-drill invariant (applies to all):** for every drill, `SELECT count(*) FROM ping_events WHERE event payload contains the drill mission_id` equals exactly 1 for completed missions; `temporal workflow show` history is the replayable source of truth for what the workflow did; and no PING-side polling loop (MissionScheduler/EventBridge/outbox) touched the drill mission (verify by mission status transitions occurring only via activity calls).

### 4.4 What the drill proves (and what it does not)

Proves: no duplicate logical work across worker kills (effect identity + idempotent activities); no lost authorized work across kills and server restart (durable history + timers + signals); correct attempt semantics (retry policy for transient, non-retryable for denials, idempotent short-circuit for post-success crashes); durable approval wait without polling.
Does NOT prove: production parity of the deployed gateway (the drill runs against `ping-temporal-dev`, not the deployed artifact); convergence of the live MissionScheduler path (that is a separate migration objective with its own falsification test); five-nines durability (dev server sqlite is not the production persistence story).

---

## 5. Audit verdict: real vs claimed

**REAL (evidence on disk or live):**
- A Temporal dev server is running on the Pig (`temporalio/temporal`, server 1.32.0), reachable at 127.0.0.1:7233, up 26h. (LIVE_RUNTIME)
- Zero workflows have ever executed on it (verified read-only, `workflow count` = 0). (LIVE_RUNTIME)
- `gateway/package.json` declares `@temporalio/{activity,client,worker} ^1.8.0` (since d596aa596). The SDK is not installed anywhere. (LOCAL_BRANCH)
- Two disjoint Temporal code integrations exist; both are non-executable (missing SDK, missing workflow files, stub activities, dead wiring paths). (LOCAL_BRANCH)
- The live durability engine is the PING-side `MissionScheduler` 5s polling loop with lease renewal, lease reaping, retry/backoff, and dead-letter routing, running in the deployed `ping-gateway:devin-boundary2` image. (LIVE_RUNTIME)
- The `feature/temporal-durable-execution` branch exists on the remote (PUBLIC_GITHUB) and carries the replay-safety fix that LOCAL_BRANCH lacks.

**CLAIMED but not real:**
- "Durable mission execution workflow" (commit 1fcfa79d2 message): the workflow exists as source, has never executed, cannot load (no SDK), and uses replay-unsafe `new Date()` at this branch.
- `TemporalRuntime` lifecycle ownership (gateway): wired in DI, but the live bootstrap does not use that DI path, `Lifecycle.start()` cannot start it (no `start()` method), and its worker config points at a missing workflow file.
- `TemporalSchedulerProvider.schedule('ConstitutionalWorkflow')`: schedules a workflow type that does not exist.
- Any statement that Temporal is "the" or "a" production execution path: the deployed gateway has zero temporal references and zero temporal log lines.

**Correction to prior recon:** `agent-f-temporal-orca-approval.md` stated no `package.json` declares `@temporalio` in the main repo. Re-checked 2026-09-19: `gateway/package.json` lines 26-28 declare `^1.8.0` (added by d596aa596). The prior report's installed-1.21.1 observation cited worktree paths that no longer exist and could not be re-verified.

**Unknowns (not provable read-only):** whether any workflow ever executed against a *previous* Temporal server instance before 2026-09-17 (the current server's sqlite starts then; no older evidence found); the exact git SHA baked into `ping-gateway:devin-boundary2` (image labels carry no SHA).

**Recommended next broken arrow (for the Temporal lane owner, not this auditor):** install the SDK pinned, converge on ONE integration (Integration A is the better design), wire the approval-effect-identity gate into the activities, run drill D1-D3 + D5-D6 against the dev server, then write the MissionScheduler convergence objective (Temporal owns scheduling/retry/recovery; the scheduler's lease logic becomes harvested mechanism, then the polling loop is retired). D4 needs Nolan's explicit authorization (container restart on live infra). Do not start D-any until the SDK is installed and the workflow loads; executing the drill against the current tree would only re-prove MODULE_NOT_FOUND.
