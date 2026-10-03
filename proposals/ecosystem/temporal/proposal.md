# Harvest Proposal: Temporal — MissionScheduler / replay / recovery seam

**Date:** 2026-10-02
**Worker:** harvest worker (Temporal assignment)
**Verdict:** ADAPT (with sub-component table below)
**Authority owner:** event-kernel
**Proof coverage:** 9, 10, 11, 12, 13, 14 (does not touch proofs 1-8)

---

## 1. What was read (official docs and source only)

| # | Source | Type | SHA / ref |
|---|--------|------|-----------|
| 1 | https://docs.temporal.io/workflow-execution | Official docs (workflow execution, replay, commands, state transitions, workflow cache) | fetched 2026-10-02 |
| 2 | https://docs.temporal.io/workflow-execution/event | Official docs (event history, activity events, limits, reset, side effect, principal attribution) | fetched 2026-10-02 |
| 3 | https://docs.temporal.io/encyclopedia/retry-policies | Official docs (retry policy defaults, formula, non-retryable errors, per-error delay, workflow retry) | fetched 2026-10-02 |
| 4 | https://github.com/temporalio/temporal/blob/main/docs/architecture/README.md | Official server design doc (event sourcing, history/matching services, tasks) | branch main, fetched 2026-10-02 |
| 5 | https://github.com/temporalio/api/blob/master/temporal/api/enums/v1/event_type.proto | Official API repo, canonical event taxonomy (60 concrete event types) | branch master, fetched 2026-10-02 |
| 6 | https://github.com/temporalio/sdk-java/blob/a41c64ece3876f584ebde70903668b817c5455d8/temporal-sdk/src/main/java/io/temporal/internal/common/WorkflowExecutionHistory.java | Official SDK source, replay-input validation contract | commit a41c64ece3876f584ebde70903668b817c5455d8 |
| 7 | https://github.com/temporalio/skill-temporal-developer/blob/HEAD/references/core/determinism.md | Official Temporal skill repo (determinism, replay mechanism, command table) | commit 133fa1df397c94c20d91a4e79029df2f894a7283 |
| 8 | https://github.com/temporalio/sdk-go/issues/828, https://github.com/temporalio/sdk-go/issues/1594 | Official SDK repo issues with replay stack traces | go.temporal.io/sdk v1.14.0 and v1.28.1 |
| 9 | https://docs.temporal.io/tasks | Official docs (task types, when workflow tasks are scheduled) | excerpt fetched 2026-10-02 |
| 10 | https://docs.temporal.io/encyclopedia/detecting-activity-failures, https://docs.temporal.io/standalone-activity | Official docs (timeout-based crash detection, heartbeats, activity ID uniqueness) | excerpt fetched 2026-10-02 |
| 11 | https://www.javadoc.io/static/io.temporal/temporal-sdk/1.17.0-RC1/index-all.html, https://pkg.go.dev/go.temporal.io/sdk@v1.28.1 | Official SDK API surfaces | fetched 2026-10-02 |
| 12 | License pages on the official repos (see section 10) | README/LICENSE statements | fetched 2026-10-02 |

No marketing copy was used. No third-party writeups were used as evidence (a few were read only to cross-check, none are cited as sources of truth).

---

## 2. Object model

Temporal's execution universe has exactly six nouns (docs, architecture README):

1. **Workflow Execution** — one durable run of deterministic orchestration code. The mission analog in PING terms.
2. **Activity Execution** — one non-deterministic, side-effecting unit of work (LLM call, HTTP, DB write). Never replayed; its *result* is recorded. This is the only place side effects are legal.
3. **Worker** — a user-hosted process executing workflow and activity code. Temporal never runs user code; the server stores history and hands out tasks.
4. **Task Queue** — a name (string) that routes tasks to workers. Workflow tasks and activity tasks flow through queues owned by the Matching Service.
5. **Event History** — the append-only, per-execution log of everything that happened. The single source of truth for durable state.
6. **Command** — a requested action the worker emits at the end of a workflow task (schedule activity, start timer, start child workflow, complete workflow...). Commands are validated and materialized into events by the server.

Derived objects worth naming for harvest:

- **Workflow Task** — the unit of decision: "advance this execution one step." Bundles all new events since the last completed workflow task. Generated on: start, signal/update, activity completion, timer fire, child completion, or a failed workflow task needing retry.
- **Retry Policy** — declarative retry contract (see section 7).
- **Marker** (MarkerRecorded) — an opaque event the server stores but does not interpret. The escape hatch for SDK-level determinism helpers (versioning patches, side-effect results).
- **Side Effect** — a one-shot non-deterministic snippet (UUID, timestamp) executed once, result recorded to history, never re-executed on replay.
- **Timer** — a durable sleep: StartTimer command -> TimerStarted event -> TimerFired event. Survives restarts; can span months.

### Minimal execution model distilled for piging2

A mission is an append-only **history** of events. Workers (interchangeable executors) never write the history. They receive a task, run code, and return a **command batch** (proposed transitions) plus results. The authority validates the commands against the current history, materializes them as events, and appends. Recovery after any crash is: fetch history, **re-run the mission code against it**, compare the commands it regenerates to the recorded events; if they match, resume from the frontier with recorded results substituted for side effects; if they diverge, halt with a typed non-determinism failure. Retries are declared once (policy) and enforced by the authority, not the worker.

---

## 3. ID scheme

- **Execution identity:** `(namespace, workflow_id, run_id)`. The workflow ID is user-supplied and business-meaningful; the run ID is server-generated (UUID). Identity is namespaced: same workflow ID can recur across runs.
- **Execution chain:** a sequence of runs sharing one workflow ID, linked by Continue-As-New, retries, or cron. The Workflow Execution Timeout applies to the whole chain; the Run Timeout to a single run. Analog: PING mission ID (stable) vs attempt ID (per run).
- **Replay identity:** synthetic. The Java SDK's replay path assigns run ID `"run_id_in_replay"` (and default workflow ID `"workflow_id_in_replay"`). Replaying never touches the original run's identity. This is exactly the correct pattern for an independent verifier: it must not be able to mutate the canonical execution by replaying.
- **Activity correlation:** scheduled event IDs map to activity IDs inside the SDK's command state machine (seen in Go SDK stack traces: "lookup failed for scheduledEventID to activityID"). Commands are matched to events by type AND semantic attributes (e.g. child workflow IDs must be deterministic).
- **Task routing identity:** the task queue name is a plain string; workers and starters must agree on it. No worker identity is baked into the execution.

---

## 4. State transitions

**Workflow Execution:** Open (Running, Paused) vs Closed (Completed, Failed, Canceled, Terminated, Timed Out, Continued-As-New). Paused stays open but receives no new workflow tasks until unpaused.

**Activity Execution:** Scheduled -> Started -> Completed | Failed | TimedOut | Canceled. Cancellation is two-phase: CancelRequested then Canceled, confirmed by the worker during a heartbeat.

**Retry visibility in history (the key subtlety):** while an activity is failing and retrying, only `ActivityTaskScheduled` appears in history. `ActivityTaskStarted` is written together with the terminal event (Completed/Failed/TimedOut). Retry attempts do not bloat history; retry state is held as `retryState=IN_PROGRESS` plus a backoff timer. The Describe API exposes the live attempt count separately.

**Workflow Task:** Scheduled -> Started -> Completed | Failed | TimedOut. A failed workflow task (usually non-determinism) is retried indefinitely with exponential backoff capped at 10 minutes, until the execution timeout (unlimited by default). The worker that handled a failed task evicts the execution from its cache (it is in an unknown state); the next task is picked up by any worker, which replays history to rebuild state.

**Canonical transition cadence (from docs):** a workflow with two sequential activities and no retries = 11 state transitions (2 for start, 4 per activity, 1 for completion).

---

## 5. Authority boundary

This is the sharpest mechanism in the whole system and the one most directly relevant to PING's authority doctrine:

1. **Workers never write history.** They emit commands inside a `WorkflowTaskCompleted` completion. The server validates and materializes them as events. Workflow code physically cannot mutate persisted state.
2. **Command/Event separation:** a Command is a proposal ("schedule activity X with args Y"); the Event is the authority's record ("ActivityTaskScheduled with payload P"). During replay the SDK compares regenerated commands against recorded events; mismatch = `NonDeterminismError` = workflow blocked until code is fixed. Divergence is never silently absorbed.
3. **External vs command-based modification is an explicit event split:** `WORKFLOW_PROPERTIES_MODIFIED_EXTERNALLY` vs `WORKFLOW_PROPERTIES_MODIFIED`, because the SDK needs to know which changes are replay-safe.
4. **Principal Attribution:** the server stamps identity fields on history events based on the authenticated caller; "they can't be forged by client code." Population requires a custom Authorizer that sets the Principal on the authorization result. Events therefore carry non-repudiable provenance.
5. **Marker transparency:** `MARKER_RECORDED` is stored but not interpreted by the server ("The Server will only store it and will not try to understand it"). The authority is a dumb durable log for SDK-level semantics; it does not pretend to understand what it cannot.

Mapping to PING: this is the execution-plane analog of PING's approval chain (identity -> authentication -> capability -> proposal -> approval -> effect). Temporal's version is: task -> code runs -> commands proposed -> authority validates vs history -> events appended. PING already has capability-gated effects; what it lacks is the **worker-proposes / authority-materializes** split as an executable contract, and the **command-vs-event divergence detector** as the verification primitive (proofs 11, 13).

---

## 6. Persistence semantics

- **Append-only per-execution log,** durably persisted by the History Service (sharded; Postgres/Cassandra/MySQL backends). All workflow state is reconstructible by replaying history at any time.
- **Compaction by Continue-As-New:** closes the current run and starts a new one in the same chain with fresh history, carrying forward input and last results. The log-size answer to unbounded growth.
- **Hard limits:** warning at 10,240 events; termination at 51,200 events, 2,000 updates, or 10,000 signals per execution. Bounded history is an enforced invariant, not a hope.
- **Ordering invariant:** the server has a `shouldBufferEvent` function in `mutableStateBuilder.go` that must be updated whenever the event enum changes; event ordering is a maintained, tested invariant, not emergent.
- **Timeouts are persisted as events/timers by the server,** not by workers. Timer start/fire/cancel are all history events, so "sleep for 6 months" is durable.

What piging2 must copy: history is append-only, replay reconstructs ALL state, log compaction is an explicit primitive (continue-as-new), and history size has enforced bounds. What to reject: the server, the sharded history service, the multi-DB persistence layer.

---

## 7. Retries and failures (the harvestable retry machine)

The Retry Policy is a declarative, authority-enforced state machine with five fields and pure-function semantics. Zero dependencies. This is the single most directly reusable primitive for proof 12.

**Fields and defaults (official):**
- `initial_interval` = 1s — delay before the first retry; the base the coefficient multiplies.
- `backoff_coefficient` = 2.0 — multiplier per retry; 1.0 = constant interval.
- `maximum_interval` = 100 x initial_interval — cap on growth.
- `maximum_attempts` = 0 = unlimited — total attempts including the first; 1 = single attempt, no retries.
- `non_retryable_error_types` = [] — matched against the Application Failure's `type` field.

**Interval formula (official):** `retry_interval = min(initial_interval * backoff_coefficient ^ (number of retries), maximum_interval)`.

**Semantics worth harvesting:**
- Activities retry by default (infinite, exponential backoff); workflows do NOT retry by default (retrying a whole deterministic replay would just repeat the same logic).
- Success "resumes as if the failure never occurred" — the workflow code path is unchanged; the failure is invisible to the orchestrator except in history.
- Non-retryable marked by the implementer (`non_retryable=true` on the failure) always wins over the caller's policy. Caller vs implementer responsibility is explicit.
- Per-error override: an Application Failure can carry its own next-retry delay, replacing the policy interval (still capped by max attempts and timeouts).
- Workflow-level retry creates a NEW run: failed run ends `WorkflowExecutionFailed` with `retryState=IN_PROGRESS` and `newExecutionRunId`; the first workflow task of the new run is delayed by the backoff, recorded as `first_workflow_task_backoff`.
- Workflow TASK failures (not workflow failures) retry forever with exponential backoff, max 10-minute interval, until the execution timeout.
- **Crash detection is timeout-based:** `start_to_close` is the worker-crash detector; if a worker dies mid-activity the timer fires, `ActivityTaskTimedOut` is written, and the retry policy schedules a new attempt. `schedule_to_start` (default infinite) is deliberately non-retryable: putting the task back on the same empty queue would be pointless.
- **Heartbeats checkpoint long work:** `activity.heartbeat(details)` records progress; on retry the attempt restarts from the top but receives the last heartbeat details, so it can skip completed work. Liveness (heartbeat timeout) is a separate optional per-attempt lease.
- **Idempotency is a two-part contract:** (a) activities must be idempotent because retries re-execute the function (at-least-once default; `MaximumAttempts=1` gives at-most-once); (b) activity IDs are unique per execution with conflict/reuse policies, which is dedup, not idempotency, and both are required.

For PING proofs: 10 (worker returns result) -> `ActivityTaskCompleted`; 11 (bad result rejected) -> non-retryable failure / command mismatch; 12 (fallback attempt succeeds) -> retry policy with attempts + backoff + per-error delay.

---

## 8. Deterministic replay (the deep mechanic)

How it actually works, from docs plus SDK source evidence:

1. The worker receives a Workflow Task containing the new events since the last completed task (first page; it pages the rest).
2. It re-executes the workflow function **from the beginning**. Every time the code would perform a durable operation, the SDK emits a Command and walks a **command state machine** (`internal/internal_command_state_machine.go` in sdk-go; `commandsHelper.handleActivityTaskScheduled`).
3. Each regenerated command is matched against the recorded event at the same history position by type AND semantic attributes (e.g. `[TMPRL1100] Command COMMAND_TYPE_START_CHILD_WORKFLOW_EXECUTION doesn't match event EVENT_TYPE_START_CHILD_WORKFLOW_EXECUTION_INITIATED ... expected value X vs actual Y`). Activity IDs map to scheduled event IDs.
4. If the command matches a recorded event: the recorded result is substituted and code continues; **the side effect is NOT re-executed.**
5. If it mismatches: hard failure (`panicIllegalState` in Go, `NonDeterministicException` in Java), surfaced as a Workflow Task failure; the execution blocks until code is fixed. Never silently skipped.
6. **History validation on replay input:** the Java SDK rejects empty histories and histories whose first event is not `WORKFLOW_EXECUTION_STARTED` (`checkHistory` in `WorkflowExecutionHistory.java`).
7. **Replay runs under a synthetic identity** (`run_id_in_replay`), so verification cannot mutate the canonical execution.
8. **Determinism constraints are enforced by convention + tooling,** not by sandbox (Go/Java have no sandbox; Python/TypeScript do): no wall-clock time, no randomness, no I/O, no native threads/channels, no map iteration without sorted keys. SDK alternatives: `workflow.now()`, `workflow.random()` / `workflow.SideEffect` (executes once, result recorded), `workflow.sleep()`. Static analysis (`workflowcheck`) plus replay tests (`WorkflowReplayer` / `Worker.runReplayHistory()` / `WorkflowReplayer.replayWorkflowExecution`) in CI.

The replay primitive is PURE: given (code, history) -> either (reconstructed state + new commands) or a typed divergence failure. No network, no DB. That purity is what makes it harvestable.

---

## 9. Revocation model

- **Cancellation (cooperative, two-phase):** `WORKFLOW_EXECUTION_CANCEL_REQUESTED` -> worker confirms -> `WORKFLOW_EXECUTION_CANCELED`. Activity cancellation confirmed via heartbeat: `ACTIVITY_TASK_CANCEL_REQUESTED` -> `ACTIVITY_TASK_CANCELED`.
- **Termination (immediate, non-cooperative):** `WORKFLOW_EXECUTION_TERMINATED`, usually via the terminate API. No handler runs.
- **Reset (surgical rewind):** terminates the execution and recreates it with the same workflow type and ID, copying history up to a valid reset point (`WorkflowTaskStarted/Completed/TimedOut/Failed`); signals can optionally be carried over. This is the production repair tool for stuck executions and is also how non-determinism is escaped when code cannot be reverted.
- **Updates can be rejected:** `EVENT_TYPE_WORKFLOW_EXECUTION_UPDATE_REJECTED` "is never written to history" — a rejected proposal leaves no trace in the canonical log.
- **Pause/Unpause:** `WORKFLOW_EXECUTION_PAUSED` / `UNPAUSED` — open but receiving no new tasks. Distinct from termination.

For PING: revocation needs exactly these three severities (cooperative cancel, immediate terminate, surgical reset-to-point). PING's owner-hold file is closest to pause. The missing piece is reset-to-event: rewind to a named history position with explicit signal carry-over semantics.

---

## 10. Evidence and receipts

- The event history itself is the audit log: every state transition is a typed, ordered event with server-stamped principal attribution.
- **Histories are exportable** (`WorkflowExecutionHistory.toJson()`; Go `ReplayWorkflowHistoryFromJSONFile`) and replayable offline, which makes them portable evidence bundles for verification and CI.
- **Describe APIs** expose live attempt counts for pending activities without polluting history.
- **Search attributes** (`UPSERT_WORKFLOW_SEARCH_ATTRIBUTES`) provide the visibility/query index over executions.

---

## 11. Tests upstream

- **Replay tests are the core test type:** `WorkflowReplayer` (Go `worker.WorkflowReplayer`, `internal/internal_worker.go`; Java `WorkflowReplayer.replayWorkflowExecution`, `io.temporal.internal.replay` package with `ReplayWorkflowTaskHandler`, `ReplayWorkflowFactory`, `ReplayWorkflowContext`). Histories captured from production are replayed against candidate code in CI; divergence fails the build.
- **Test workflow environments:** Go `internal_workflow_testsuite` (`TestWorkflowEnvironment`), Java `temporal-testing` module, TypeScript `TestWorkflowEnvironment.createTimeSkipping()` (a multi-day sleep runs in milliseconds — deterministic time is injectable).
- **Server-side:** the `shouldBufferEvent` ordering invariant in `mutableStateBuilder.go` must be updated with every event-enum change (a compile/review-time contract, effectively a test of the taxonomy).
- **Adversarial posture:** divergence on replay is a first-class, tested failure mode (`[TMPRL1100]` errors with command-vs-event diffs), not an edge case.

For piging2: the test to copy is replay-against-captured-histories in CI. Every mission-logic change must replay cleanly against a corpus of real histories, or the change ships behind a version gate (Temporal's `patched()` / worker build-ID versioning).

---

## 12. Dependency analysis

**DEPENDENCY_COST: zero.**

Everything harvested here is a contract, a formula, or a pure algorithm:

| Harvested item | Form | Dependencies |
|---|---|---|
| Command/Event separation + authority materialization | design contract | none |
| Deterministic replay + command<->event divergence check | pure function of (code, history) | none |
| Retry policy (5 fields + interval formula) | pure arithmetic | none |
| Timeout-based crash detection (start_to_close lease, heartbeat checkpoint) | state machine on top of the event log | none |
| Revocation triple (cancel / terminate / reset-to-point) | event types + transition rules | none |
| History bounds + continue-as-new compaction | policy | none |
| Principal attribution (server-stamped caller identity on events) | authz integration pattern | none beyond existing auth |

Nothing requires the Temporal server, any SDK, gRPC, protobuf, or a database. The event-type taxonomy (60 types) is reference material; piging2 needs ~8 types, not 60. The SDKs are language runtimes PING does not need.

---

## 13. License finding

Verified from official sources (read 2026-10-02):

- **temporalio/temporal (server): MIT** — README links the MIT LICENSE file.
- **temporalio/sdk-go: MIT** — pkg.go.dev/go.temporal.io/sdk@v1.28.1 states "MIT License, please see LICENSE for details."
- **temporalio/sdk-python: MIT** — conda-forge feedstock records package license MIT.
- **temporalio/sdk-dotnet: MIT** — README license badge.
- **temporalio/ai-integrations: MIT** — root LICENSE is source of truth.
- **temporalio/api: MIT** (same org; protos consumed by MIT SDKs).
- **temporalio/sdk-java: Apache-2.0** — license headers in source files read directly (Copyright Temporal Technologies / Amazon / Uber; "Licensed under the Apache License, Version 2.0").

**No GPL, AGPL, SSPL, or BSL anywhere in the Temporal stack. Nothing to flag for Nolan.** Both MIT and Apache-2.0 are permissive; since the harvest takes mechanisms (reimplemented to PING semantics), not copied code, license exposure is effectively nil regardless.

---

## 14. Verdict: ADAPT (component table)

| Component | Verdict | Reason |
|---|---|---|
| Temporal server (history/matching/frontend services, sharded persistence) | **REJECT** | Directive is explicit: do not propose adopting the server. PING already has an event spine; a second execution authority would violate the one-authority rule. |
| SDKs as libraries (Go/Java/Python/TS/.NET/Ruby) | **REJECT** | Language runtimes with their own determinism models; PING missions are not SDK workflow functions. |
| Sticky execution / workflow cache / LRU | **REJECT** | Performance optimization for the server's worker fleet; premature for piging2. Design note only: persist commands, not in-memory state, so caching stays possible later. |
| Command/Event separation (workers propose, authority materializes) | **ADAPT** | The authority boundary PING's event-kernel needs for proofs 11/13. Implement as PING-native: workers emit intent proposals, the event-kernel validates against current history and appends events. |
| Deterministic replay + divergence check | **ADAPT** | The missing verification primitive (see section 15). Pure, zero-dep, maps directly to proofs 13/14. |
| Retry Policy (5 fields + formula + non-retryable + per-error delay) | **ADAPT** | Declarative, authority-enforced retries for proof 12. Take the field set and formula exactly; reimplement against PING's mission attempts. Defaults (1s / 2.0 / 100x / unlimited) are sane as-is. |
| Timeout-based crash detection + heartbeat checkpoints | **ADAPT** | `start_to_close` as the crash lease; heartbeats as progress checkpoints delivered to the retry attempt. Needed for the event-spine exactly-once archaeology (UNKNOWN -> FAILED -> retry). |
| Revocation triple (cancel / terminate / reset-to-point) | **ADAPT** | PING has owner-hold (pause analog); it lacks surgical reset-to-history-point. |
| History bounds + continue-as-new compaction | **ADAPT** | Enforced history size limits; explicit compaction primitive instead of unbounded log growth. |
| Event taxonomy (60 types) | **REJECT as a whole; ADAPT as reference** | piging2 needs ~8 event types, not 60. Use the taxonomy as a checklist of what a mature system eventually distinguishes (timers, markers, signals, updates, nexus), not as a schema to copy. |
| Principal attribution | **ADAPT** | Server-stamped caller identity on events; directly strengthens PING's evidence/provenance. Implement against PING's existing auth. |

**What NOT to harvest even though it is tempting:** the workflow-task machinery (`WORKFLOW_TASK_SCHEDULED/STARTED/COMPLETED`) exists because Temporal separates decide-from-do across a network between user-hosted workers and a hosted server. piging2's scheduler does not have that split; copying it would add plumbing without a problem.

---

## 15. SMALLEST MISSING PRIMITIVE

**Deterministic code-replay verification: re-run mission logic against the canonical event history, compare the commands it generates to the recorded events, and treat ANY divergence as a typed failure (never as state).**

Why this is the smallest thing that earns its weight:

- PING already has an event journal, evidence, missions, and an independent verifier (ORCA proved worker-claim != verified-truth). What it does NOT have is replay as an executable verification: currently replay means reading events to reconstruct a view. Temporal proves replay must mean **running the mission's own logic against the history** and checking that the logic still generates the same command sequence. That turns history from a record into a falsifier.
- It is pure: `(mission logic, history) -> reconstructed state | DIVERGENCE`. Zero dependencies, no server, no network.
- It directly serves proofs 11 (injected bad result: the replayed commands will not match the poisoned history -> rejected), 13 (verification is independent of the worker that produced the result, runs under a synthetic identity that cannot mutate the canonical run), and 14 (replay reconstructs relevant state — the mechanism IS proof 14).
- It answers the open event-spine archaeology question (MEMORY.md, 2026-10-02): at each kill point, what replay can know. Temporal's answer: after a worker crash, the new worker replays code against history; recorded side-effect results are substituted, never re-executed; commands that do not match recorded events are a failure, not an ambiguity. `UNKNOWN` therefore collapses to either "replayable" or "divergent," both typed.

Second, not smallest but required for proof 12: the declarative Retry Policy as authority-enforced state (5 fields, one formula). It is the only other item on this list that is a self-contained, zero-dependency, drop-in primitive.

Everything else in this proposal is either already owned by PING (event spine, capabilities, evidence) or correctly REJECTED (the server).

---

## 16. Proof mapping

- **Proof 9 (create one mission):** `WORKFLOW_EXECUTION_STARTED` with `(namespace, workflow_id, run_id)` identity; workflow ID = stable mission identity, run ID = attempt. Mission creation is an authority-appended event, never a worker write.
- **Proof 10 (worker returns result):** `ACTIVITY_TASK_COMPLETED` — the worker reports the outcome; the authority appends the terminal event. Worker and authority are separate processes; the result crosses the boundary as data, not as state mutation.
- **Proof 11 (injected bad result is rejected):** two mechanisms. (a) Command/event divergence on replay: a poisoned result or altered logic produces commands that do not match recorded events -> `NonDeterminismError` / `[TMPRL1100]`, a hard failure, never silent. (b) Non-retryable failure types: the implementer can mark result classes that must surface immediately, and the marker always wins over retry policy.
- **Proof 12 (fallback attempt succeeds):** Retry Policy with attempts, exponential backoff, per-error next-retry delay, and heartbeat checkpoints delivered to the retry attempt so fallback resumes from progress instead of restarting. Success "resumes as if the failure never occurred."
- **Proof 13 (VERIFIED only after independent verification):** workers propose commands; the authority validates and materializes events; replay verification runs under a synthetic identity (`run_id_in_replay`) that cannot mutate the canonical execution. Verification is structurally incapable of being the thing it verifies.
- **Proof 14 (replay reconstructs relevant state):** history replay — re-execute mission code from the beginning against the canonical history, substitute recorded results for side effects, rebuild in-memory state to the frontier. Crash recovery, cache eviction, and offline verification are all the same operation.

No mapping to proofs 1-8 (ingest/render/Ask FYD/owner loop): this harvest is the execution seam only.

---

## 17. Open questions for the coordinator

1. PING's event-kernel owns this ADAPT, but the command-validation step touches capability-kernel semantics (who may propose what). Confirm the seam: event-kernel validates proposals against history; capability-kernel authorizes the actor. Do not merge them.
2. The retry policy needs PING's timeout vocabulary mapped: which PING timeout is `schedule_to_close` (whole mission attempt budget) vs `start_to_close` (single attempt lease)? Decide before implementing.
3. Continue-as-new is the log-compaction answer; PING's JSONL doctrine says JSONL must not become a second canonical authority. The compaction primitive must therefore live in the event-kernel (Postgres-backed), with JSONL as export only.
