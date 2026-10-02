# GAPS: What the Spine Does NOT Do That ORCA Needs

Repo: `/home/nolan/ping` | Branch: `refactor/runtime-authority-convergence` | Commit: `cc6856c3bc78e0535e66f168c66dc31abee2c073`
Each gap states the exact missing piece, with the source evidence for why it is missing.

---

## GAP 1: Run identity

**Missing:** There is no Run entity anywhere in the execution path. Missions are the only work unit: `mission_id = sha256(missionType:event_id or payload)[:16]` (`ping-runtime/orchestration/mission_runtime.js:79-90`). There is no `Run` class (repo-wide grep: zero), no `agent_id` field anywhere in `mission_runtime.js` / `mission_scheduler.js` / `worker_runtime.js` (zero hits), and no `(agent_id, run_id)` keying in any table (`ping_missions` columns: mission_id, mission_type, status, priority, payload, result, assigned_to, created_by, timestamps, error, retries, retry_at, lease_until, claimed_at).

**Consequence:** ORCA cannot name, track, or attribute an execution run. There is nothing to hang attempts, checkpoints, or work packets off of.

## GAP 2: Work packets

**Missing:** There is no work-packet abstraction. The unit of scheduled work is a mission whose payload is an unstructured JSONB blob assembled ad hoc by `EventToMissionBridge._handleEvent` (`ping-runtime/orchestration/event_to_mission_bridge.js:116-126`): `{event_id, event_type, source, namespace, correlation_id, canonical_hash, confidence, payload}`. No schema, no version field, no packet envelope, no `RESULT_SCHEMA.json` (does not exist repo-wide despite `evidence/2026-09-18/PATCH_CONVERGENCE_REPORT.md:23` claiming results validate against it).

**Consequence:** No contract between "what was asked" and "what was done" beyond the free-form payload blob.

## GAP 3: Attempts

**Missing:** Retries are a bare counter. `failWithRetry` (`mission_runtime.js:207`) does `SELECT retries`, increments, and writes back the integer; on exhaustion it writes status `failed`. There is no attempt record: no attempt id, no per-attempt start/end timestamps, no per-attempt input snapshot, no per-attempt output or error capture. The only trace of a past attempt is the incremented `retries` integer and the overwritten `error` text column.

**Consequence:** ORCA cannot answer "what happened on attempt 2" or diff attempts. Evidence is limited to the final error string.

## GAP 4: Checkpoints

**Missing:** No checkpoint mechanism exists in the spine. The mission lifecycle is `created -> assigned -> running -> completed/failed` with `retry_pending` as the only intermediate holding state, and `retry_pending` carries no partial progress (payload is never updated mid-run; `complete()` writes the result only once, at the end). A worker that dies mid-run restarts from scratch via lease reclaim.

**Consequence:** No resumable partial progress; every retry is a full redo.

## GAP 5: UNKNOWN outcomes

**Missing:** The outcome vocabulary is exactly: `completed`, `failed`, `retry_pending` (transient), plus the unhandled fourth state: stuck forever. There is no UNKNOWN / INDETERMINATE / TIMED_OUT status. Worse than missing: the stuck case is actively mishandled. `MissionScheduler._dispatch` awaits `WorkerRuntime.dispatch(event)` with no timeout (`mission_scheduler.js:242`); a hung `worker.handle()` keeps the mission in the in-memory `_processing` set, Arrow 0 renews its lease every 5s poll (`mission_scheduler.js:129-140`), so `reapExpiredLeases()` never reclaims it. The slot leaks; at `maxConcurrent: 3`, three hung workers stall the scheduler permanently. No timeout, no UNKNOWN marking, no escalation.

**Consequence:** ORCA's finish criteria require UNKNOWN as a first-class outcome; the spine can only produce it by never producing anything.

## GAP 6: Dependency graph

**Missing:** Missions are independent rows. `EVENT_MISSION_MAP` (`event_to_mission_bridge.js:29-75`) is a flat event-type to mission-type lookup; `MISSION_WORKER_MAP` (`mission_scheduler.js:36-83`) is a flat mission-type to worker-label lookup (documented as labeling metadata only, not a routing decider). The multi-stage pipeline (observation -> claim -> classification -> ...) emerges only because workers emit the next event type and the bridge creates the next mission. There is no declared DAG, no depends-on edges, no fan-in/fan-out, no way to express "mission B requires mission A."

**Consequence:** ORCA cannot plan, order, or gate dependent work; chains are implicit and undiscoverable except by reading worker code.

## GAP 7: Approval binding

**Missing:** No approval gate exists on the live path. The only approval construct in the repo is `approvalSignal` / `approvalStatusQuery` in the Temporal workflow (`ping-runtime/temporal/workflows/mission_workflow.js:31-38`), which is dormant (zero references in the boot file `gateway/bootstrap/gateway_runtime.js`). The live scheduler dispatches every pending mission unconditionally; `getPending` has no approval filter and `ping_missions` has no approval columns.

**Consequence:** ORCA cannot pause a run for human approval or bind a decision to a run.

## GAP 8: MCP adapters

**Missing:** The spine has zero MCP integration. Repo-wide: no `mcp` references in `ping-runtime/orchestration/execution/`, `mission_scheduler.js`, `mission_runtime.js`, or `worker_runtime.js`. The Python `ExecutionAuthority` (`runtime/authorities/execution_authority.py`) exposes exactly one adapter, `SubprocessExecutionAdapter`; the `ExecutionAdapter` Protocol exists but has no other implementation. `ContainerExecutionAdapter` does not exist anywhere (zero hits repo-wide). No MCP client, server, or tool bridge touches the execution path.

**Consequence:** ORCA has no tool-use plane on the spine; workers are in-process JS with no external tool execution at all (zero subprocess calls in the entire JS spine).

---

## Cross-cutting gaps (found during the trace, needed for a durable engine)

**GAP 9: Bridge mission-creation failure loses work silently.** `EventToMissionBridge._handleEvent` catches creation errors, logs, increments `stats.failed`, and moves on (`event_to_mission_bridge.js:128-131`). The event is already durably in `ping_events`; the mission never exists; nothing retries creation. Accepted event with no mission and no alarm.

**GAP 10: No result verification or WORKER_COMPLETED emission on the live path.** `recordVerifiedResult` does not exist in source (only claimed in `evidence/2026-09-18/PATCH_CONVERGENCE_REPORT.md:23`). `WORKER_COMPLETED`/`WORKER_FAILED` are emitted only by the boot seed (`gateway_runtime.js:887`); real completions emit `MISSION_COMPLETED` with an unverified worker-supplied result blob. There is no verification gate between "worker returned" and "result recorded."

**GAP 11: No worker supervision.** `WorkerRuntime.health()` has zero callers; no supervisor process exists; stuck workers are renewed forever (see GAP 5). The only liveness signal is the lease, which the scheduler itself keeps alive for stuck work.

**GAP 12: The spine never reaches the OS.** The entire live path (bridge -> missions -> scheduler -> workers) is in-process Node.js with zero subprocess calls. The Python `ExecutionAuthority` (the claimed "sole OS execution primitive") is not called by any JS spine component; it serves a separate Python plane (`tool_router.py`, `supervisor.py`, `constitutional_event_loop.py`, all CLI/subprocess tools). Bottoming ORCA out in the "proven live PING execution spine" therefore bottoms it out in an in-process JS worker pool, not in ExecutionAuthority. If the requirement is that ORCA execution must flow through ExecutionAuthority, that link does not exist and must be built; it is not a matter of tracing it.
