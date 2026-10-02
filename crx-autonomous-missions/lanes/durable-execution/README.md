# Durable Execution — Harvest Lane

Research-only lane. No building into CRX, no FYD/Jev/Pig contact, no pushes, no credentials anywhere in this directory.

**Sources inspected (shallow clones, commit-pinned):** temporalio/temporal `543367e`, restatedev/restate `c0b4a74`, inngest/inngest `0f081e4`, triggerdotdev/trigger.dev `b576a9a`, hatchet-dev/hatchet `e84b24e5`, langchain-ai/langgraph `bdb85b5`, PrefectHQ/prefect `148e997`, dagster-io/dagster `45d7de6`, dapr/dapr `b2332b1`, dbos-inc/dbos-transact-py `8ee6781`. Scratch clones live at `~/workspace/scratch/durable-exec-src/` (research only, never to be committed).

**Output:** `mechanisms.jsonl` — 31 mechanisms, every claim pinned to repo commit + file path. README claims were checked against source; falsifications are recorded as mechanisms (HARVEST_CLASS=REJECT), not silently dropped.

---

## HEADLINE: What CRX owns vs what infrastructure owns

The critical question, answered per mechanism. The boundary rule:

> **CRX owns meaning. Infrastructure owns mechanics.**
> Anything that decides what something IS (identity, vocabulary, classification, policy, evidence, replay semantics) is CRX-constitutional, because CRX already has exactly one authoritative owner per concern (identity, canonicalization, hash, evidence, observation, config, knowledge, replay, projection, witness, constitutional). Anything that merely moves, waits, retries, or stores it is generic infrastructure: adopt the mechanism, never rebuild it, and never adopt the whole system.

| # | Mechanism | Verdict | CRX owns (constitutional) | Infrastructure owns (adopt) |
|---|-----------|---------|---------------------------|------------------------------|
| 1 | Durable task state | **SPLIT** | Event vocabulary, causation/correlation lineage, canonicalization at ingress (ping_events already exists) | Append + replay-fold mechanics (Temporal MutableStateRebuilder pattern, Hatchet RUN log) |
| 2 | Sleep/wake | **ADOPT** | Resume-point semantics (decision boundary), evidence grading of wake payloads | Timer wheel, suspend record, resume delivery (Inngest Pause, Trigger checkpoint suspend/restore) |
| 3 | Timers | **ADOPT** | Nothing (deadlines are data) | Visibility-timestamp timer queue (Temporal CategoryTimer) |
| 4 | Leases | **ADOPT** | What the lease protects: decider lease per mission, slot lease per attempt | Acquire/renew/expire primitive (Hatchet LeaseManager) |
| 5 | Retries | **SPLIT** | Retryability classifier: CRX's transient-vs-permanent failure taxonomy | Backoff/jitter math, attempt counters (Temporal retry_policy.go) |
| 6 | Idempotency | **SPLIT** | Key namespaces and ID formats (identity authority: mission/attempt/step IDs) | Claim-store mechanics, deterministic derivation (Hatchet ClaimKey, Inngest seeded ULIDs) |
| 7 | Signals | **SPLIT** | Signal types, ingress authorization, causation linkage (action-level auth is a proven CRX gap) | Record-then-deliver mechanics (Temporal SignalWorkflowExecution) |
| 8 | Human approval | **CRX OWNS** | The approval record: who, what was shown, decision, rationale, evidence linkage. Bearer-token models (Restate awakeable HTTP, Trigger waitpoint URL) are **rejected** for CRX | Suspend/resume machinery underneath; LangGraph typed-interrupt shape as the pattern |
| 9 | Workflow continuation | **SPLIT** | What carries forward, lineage linkage (causation gap) | Rotation mechanics (Temporal continue-as-new event shape) |
| 10 | Process death | **SPLIT** | Classification: CRASHED (outcome unknown, safe to retry) vs FAILED (agent-concluded, retry only with new info); recovery policy | Detection: heartbeat timeouts, exit observation (Temporal, Prefect, DBOS) |
| 11 | Machine death | **ADOPT** | Nothing beyond #10's classification | Stale-worker sweeper (Hatchet lastHeartbeatAt cleanup) |
| 12 | Worker death | **SPLIT** | FROM_FAILURE resume planner over the step journal | Recovery queue + atomic claim (DBOS reenqueue-for-recovery) |
| 13 | UNKNOWN_OUTCOME | **CRX OWNS** | The honest classification per step: exactly-once vs at-least-once, the residual crash window stated explicitly, never pretended away. Touches evidence + replay | Step-journal record mechanics (DBOS step recording, Restate journal replay) |
| 14 | Compensation | **CRX OWNS (record)** | The compensation record as evidence (what was undone, linked to the original action). **No surveyed engine provides compensation** (Temporal saga claim: falsified) | Execution of compensating actions reuses the normal attempt machinery |
| 15 | Reconciliation | **SPLIT** | Policy: what "overdue" means per record type (suspend, lease, gate) | Lazy re-drive mechanics: overdue predicate + rate-limited re-assertion on status read (Dapr redriveOverduePendingStart) |

**What this means in one paragraph:** Do not build Temporal inside CRX. Do not adopt any of these systems. Take: the per-attempt Run identity shape (Restate), the typed interrupt approval primitive (LangGraph), the step journal with honest at-least-once labeling (DBOS), the heartbeat-timeout liveness detector (Temporal), the CRASHED-vs-FAILED vocabulary (Prefect), the unified suspend record with mandatory expiry (Inngest), the atomic-claim recovery queue (DBOS), and the lazy overdue re-drive (Dapr). Everything taken is a mechanism extracted and re-keyed to CRX's identity/evidence/replay authorities. The approval record, the retry classifier, the UNKNOWN_OUTCOME labels, and the compensation record stay CRX-constitutional because they ARE authority, evidence, and replay semantics.

---

## Findings by system (source-pinned)

### Temporal (MIT) — the event-sourcing reference
- **Event history as source of truth + rebuildable mutable state.** `service/history/workflow/mutable_state_rebuilder.go`: `MutableStateRebuilder.ApplyEvents` folds event batches into state. Crash recovery = re-fold. This is the pattern CRX's ReplayAuthority should follow over `ping_events`.
- **Typed retry classifier.** `common/retrypolicy/retry_policy.go`: `IsRetryableFailure` — canceled/terminated never retry; only START_TO_CLOSE and HEARTBEAT timeouts retry (schedule timeouts don't: they signal capacity problems, not task problems). Pure function of (failure, policy). Directly portable to CRX's failure taxonomy.
- **Two-level death detection.** Activities: heartbeat timeout via `ActivityTimeoutTask` (`service/history/tasks/activity_task_timer.go`, heartbeat state in `service/history/workflow/activity.go`) with heartbeat *details* passed to the retry attempt for resume-with-progress. Workflow tasks: `WorkflowTaskTimeout` + `WorkflowTaskTimedOut` history event + reschedule (`service/history/workflow/workflow_task_state_machine.go`). CRX needs both levels: subagent-attempt heartbeats AND parent-decision-step leases.
- **Signals as history events.** `historyEngineImpl.SignalWorkflowExecution` (`service/history/history_engine.go:686`): record first, deliver at the decision boundary. CRX must add ingress authorization (proven gap).
- **Continue-as-new.** `AddContinueAsNewEvent` (`mutable_state_impl.go:6309`): bounded history via explicit linked rotation. CRX run rotation should copy this event shape.
- **Idempotent start.** `WorkflowIdReusePolicy` + request-ID dedup at `StartWorkflowExecution`. CRX MissionRuntime has deterministic mission IDs; per-attempt IDs need the same treatment.
- **FALSIFIED: no engine-level saga/compensation.** Repo-wide grep for saga/compensation in server source: zero engine hits. Compensation in Temporal-land is a user-space pattern. Do not cite Temporal as a compensation source.

### Restate (BSL-1.1) — the journal reference
- **Journal entry types as the durable program.** `crates/types/src/journal/entries.rs`: `EntryType` enum — `Sleep`, `Awakeable`/`CompleteAwakeable`, `GetPromise`/`CompletePromise`, `Call`, `AttachInvocation`, `Run` are all first-class. Replay returns recorded results instead of re-executing. This is the vocabulary CRX's step journal should steal (renamed to agent operations).
- **Awakeables: external wake without held workers.** `crates/ingress-http/src/handler/awakeables.rs`: HTTP POST resolve/reject on an awakeable ID; resolution is journaled. The mechanism is right; the **bearer-token security model is wrong for CRX** (ID knowledge = control). CRX approvals need authenticated, typed, evidence-linked resolution.
- **InvocationId shape.** `crates/types/src/identifiers.rs`: `InvocationId = partition_key + InvocationUuid(u128)`. CRX's missing per-attempt Run identity should be `(mission_id, attempt_seq, uuid7)`: same shape, mission ID as the routing/lineage key.
- **License: BSL-1.1.** PATTERN-only. Never embed Restate code in CRX.

### Inngest (SSPL-1.0) — the suspend-record reference
- **Pause: one record for sleep, event-wait, and signal-wait.** `pkg/execution/state/pause.go`: `Pause{ID, Identifier, Outgoing, Incoming, Expires (required), Event, Expression, SignalID, OnTimeout, DataKey}`. Mandatory expiry kills "stalled forever". `OnTimeout` gives clean timeout-vs-event branch semantics. CRX's suspend record should be this shape.
- **Opcode-based durable steps.** `pkg/execution/state/opcode.go`: `OpcodeSleep`, `OpcodeWaitForEvent` — the durable program is an opcode stream, replay re-interprets instead of re-running. CRX attempts need an equivalent step protocol (TOOL_CALL, SPAWN, WRITE, SLEEP, WAIT_SIGNAL, CHECKPOINT) — with the caveat that CRX agents are adversarial reporters, so step claims must be reconciled against tool receipts, not trusted.
- **Seeded idempotency.** `pkg/event/id.go`: `SeededIDFromString` derives deterministic ULIDs from `(millis, entropy+index)`. Retried submissions converge without lookup.
- **Per-step retries.** `pkg/execution/executor/executor.go`: `RetryCount()`, `MaxAttempts`, `queue.ShouldRetry` — failed steps retry without re-running completed ones.
- **License: SSPL-1.0** (LICENSE.md: "Server Side Public License... Apache 2.0 Future License"). A common misreading is "Apache 2.0" — it is not. PATTERN-only.

### Trigger.dev (Apache-2.0) — the approval-UX reference
- **Waitpoints: tokenized human approval.** `packages/trigger-sdk/src/v3/wait.ts`: `wait.createToken({idempotencyKey, timeout, tags})` + `wait.forToken(token).unwrap()`; completion by URL (webhook handoff); timeout raises `WaitpointTimeoutError` (never hangs). The UX shape CRX approval gates should copy; the bearer-URL auth must be replaced with CRX evidence-grade resolution.
- **Checkpoint suspend/restore.** `packages/core/src/v3/schemas/checkpoints.ts`: suspend names `(runId, snapshotId, runnerId, reason)`; restore rehydrates by snapshot. The `reason` field is the audit hook.
- **Heartbeats.** `packages/core/src/v3/heartbeats/`: liveness = fresh heartbeats; silence = requeue. Fold into CRX's attempt-heartbeat work, not a separate mechanism.

### Hatchet (MIT) — the lease/queue reference
- **Tenant-scoped lease manager.** `pkg/scheduling/v1/lease_manager.go`: schedulers only schedule what they hold a Postgres-backed lease on (queues, workers, concurrency slots). CRX needs this before multi-scheduler scale; today it applies to worker-slot assignment.
- **Durable event log kinds.** `pkg/repository/sqlcv1/models.go`: `V1DurableEventLogKind = RUN | WAIT_FOR | MEMO` (+ `pkg/repository/durable_events.go`, DAG replay test). CRX should add WAIT_FOR and MEMO as `ping_events` types: signal waits as first-class log entries, memoization for deterministic recomputation.
- **Idempotency claim with TTL.** `pkg/repository/idempotency.go`: `ClaimKey` returns bool; the winner's execution ID is recorded so losers *attach* instead of being rejected. Strictly better than reject-duplicate.
- **Stale worker cleanup.** `pkg/repository/sqlcv1/workers.sql.go`: `cleanupOldWorkers` on `lastHeartbeatAt`. The machine-death half of liveness.

### LangGraph (MIT) — the agent-state reference
- **Checkpoint shape.** `libs/checkpoint/langgraph/checkpoint/base/__init__.py`: `Checkpoint{v, id (monotonic), ts, channel_values, channel_versions, versions_seen, updated_channels}`; `BaseCheckpointSaver` keyed by `thread_id` with cross-thread copy (fork). `versions_seen` deterministically computes the runnable set after resume. This is the snapshot shape CRX attempts need.
- **Typed interrupts.** `libs/langgraph/langgraph/types.py`: `interrupt(value, response_schema)` -> `Interrupt{id, value, response_schema}`; resume via `Command(resume={id: answer})`. Interrupts live in the checkpoint; resume is data. Best replay story of any approval primitive surveyed. CRX must add answer provenance (LangGraph trusts the answer; CRX evidence-grades it).

### Prefect (Apache-2.0) — the state-vocabulary reference
- **CRASHED vs FAILED.** `src/prefect/client/schemas/objects.py`: `StateType` with `TERMINAL_STATES = {COMPLETED, CANCELLED, FAILED, CRASHED}`. CRASHED = infrastructure died, outcome unknown, safe to retry. FAILED = code ran and raised. This vocabulary split is half of the UNKNOWN_OUTCOME solution. Server-validated transitions = fail-closed state changes.
- **Pause-and-exit suspension.** `src/prefect/exceptions.py:310` + `src/prefect/_flow_run_suspension.py`: suspend = persist state + exit process; resume = fresh process. Zero worker held during approval waits. CRX subagents awaiting approval should exit, not block slots.

### Dagster (Apache-2.0) — the re-execution reference
- **ReexecutionStrategy.** `python_modules/dagster/dagster/_core/execution/plan/resume_retry.py`: `ALL_STEPS | FROM_FAILURE | FROM_ASSET_FAILURE`, computed from the event log (`DagsterEventType`: STEP_SUCCESS/STEP_FAILURE...). CRX attempt retry should default to FROM_FAILURE over the step journal: re-run only steps without recorded outputs.

### Dapr (Apache-2.0) — the reconciliation reference
- **Lazy overdue re-drive.** `pkg/actors/targets/workflow/common/pendingstart/pendingstart.go:64` (`Overdue`: past due time + grace) + `pkg/runtime/wfengine/backends/actors/actors.go:185` (`redriveOverduePendingStart`: rate-limited, detached, idempotent re-assertion of lost start reminders). The portable insight: **reconcile on status read, not on a global sweeper.** Every CRX status read should evaluate overdue predicates (suspend past resume time, heartbeat overdue, gate past SLA) and re-drive.
- **Single decider.** Workflow actor = one decision thread per workflow with history in actor state. CRX: exactly one parent decider per mission at a time, enforced by lease, not convention.

### DBOS (MIT) — the honest-recovery reference
- **Atomic recovery.** `dbos/_recovery.py`: recovery *re-enqueues*; the atomic ENQUEUED->PENDING dequeue admits exactly one runner, making duplicate recovery idempotent. "Recovery re-enqueues rather than executing directly." CRX crash recovery: move CRASHED attempts to a recovery queue, claim atomically, never resume in place.
- **Step recording with honest labeling.** `dbos/_dbos.py` + `dbos/_sys_db.py`: recorded steps never re-execute; child spawn is transactional with the parent's step record ("a crash leaves both or neither", `_sys_db.py:5201`). The residual window (crash between external side effect and record) is *labeled* at-least-once, not pretended exactly-once. This is the UNKNOWN_OUTCOME treatment CRX should adopt: shrink the window with atomic recording, label what remains.

---

## Falsified claims (explicit)

1. **"Temporal has built-in sagas/compensation."** FALSE at engine level. No saga/compensation mechanism in `temporalio/temporal` server source (verified by repo-wide grep at commit `543367e`). Saga is a user-space pattern in that ecosystem. Recorded as `TEMPORAL-SAGA-ABSENT` (REJECT).
2. **"Inngest is Apache 2.0."** FALSE. `inngest/inngest` LICENSE.md is **SSPL-1.0** ("Server Side Public License... Apache 2.0 Future License"). Mechanisms are PATTERN-only; code must not be embedded.
3. **"Restate is Apache 2.0 / MIT."** FALSE for the runtime. `restatedev/restate` LICENSE is **BSL-1.1**. PATTERN-only.

## License summary for harvest classes

| Project | License | Max harvest class | Note |
|---|---|---|---|
| Temporal | MIT | ADAPT/REUSE | Server is heavy; take mechanisms, not the system |
| Restate | BSL-1.1 | PATTERN | Never embed |
| Inngest | SSPL-1.0 | PATTERN | Never embed |
| Trigger.dev | Apache-2.0 | ADAPT | SDK shapes referenceable |
| Hatchet | MIT | REUSE | Direct port allowed |
| LangGraph | MIT | ADAPT | Direct port allowed |
| Prefect | Apache-2.0 | ADAPT | Referenceable |
| Dagster | Apache-2.0 | PATTERN | Referenceable |
| Dapr | Apache-2.0 | PATTERN | Runtime too heavy to adopt; take the re-drive pattern |
| DBOS | MIT | ADAPT | Direct port allowed |

## Recommended harvest priority (expected value x cost, vs CRX's proven gaps)

1. `RESTATE-INVOCATION-ID` — per-attempt Run identity. Fills the #1 proven gap; every other mechanism keys off it. Cost: Low.
2. `LANGGRAPH-INTERRUPT` — typed approval gates with checkpoint-resident interrupts. Fills the human-approval gap with the best replay story. Cost: Medium.
3. `DBOS-STEP-RECORDING` — step journal + honest UNKNOWN_OUTCOME labeling. Fills the MCP/tool-execution-path gap structurally. Cost: Medium.
4. `TEMPORAL-ACTIVITY-HEARTBEAT-TIMEOUT` — subagent liveness with progress-carrying heartbeats. Cost: Medium.
5. `PREFECT-STATE-MACHINE` — CRASHED vs FAILED vocabulary + server-validated transitions. Cost: Low.
6. `INNGEST-PAUSE` — unified suspend record, mandatory expiry. Cost: Medium.
7. `DBOS-ATOMIC-RECOVERY` — crash recovery via re-enqueue + atomic claim. Cost: Low-Medium.
8. `DAPR-PENDINGSTART-REDRIVE` — lazy overdue reconciliation on status read. Cost: Low.
9. `TEMPORAL-RETRY-POLICY` — retryability classifier over CRX's failure taxonomy. Cost: Low.
10. `HATCHET-IDEMPOTENCY-CLAIM` — claim-with-attach idempotency. Cost: Low.

## What was deliberately NOT harvested

- **Whole systems.** Adopting Temporal/Restate/Inngest/Dapr as CRX's execution substrate would create the second orchestration universe the directive forbids. Every entry is a mechanism, never a system.
- **Bearer-token approval models** (Restate awakeable HTTP, Trigger waitpoint URL): rejected for CRX's threat model; approval resolution must be authenticated, typed, and evidence-linked.
- **Temporal's saga-shaped hole**: there is no engine compensation to harvest; the compensation *record* is CRX-constitutional work, not adopted machinery.

## Method note

Every mechanism above was verified in source at the pinned commit (file + line/symbol). Where a README or docs claim had no corresponding source (saga in Temporal), it is recorded as falsified, not as a mechanism. `IMPLEMENTATION != PRODUCTION PROOF` is respected throughout: these are mechanism designs with stated failure models, not production guarantees; each entry carries a falsification test designed to break it.
