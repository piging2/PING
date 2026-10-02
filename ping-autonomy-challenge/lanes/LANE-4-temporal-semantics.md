# LANE 4 — TEMPORAL SEMANTICS HARVEST
## PING Autonomy Grand Challenge, Wave 1 — Mechanism Archaeology

**Role:** Research / falsification / harvest ONLY. No adoption proposal. Temporal's invariants, not its binary.

**Date:** 2026-09-23
**Researcher:** Pigi (subagent, lane 4)

---

## 1. Sources + pinned SHAs

### 1.1 Source code (cloned read-only, HEAD pinned)

| Repo | Pinned SHA | Commit date | Commit subject |
|------|-----------|-------------|----------------|
| `github.com/temporalio/sdk-go` | `626130f1fd9de50cfd90b884a3fb796504f22dc1` | 2026-09-16 | Mark Priority as stable (#2699) |
| `github.com/temporalio/sdk-python` | `eb642b14947bd8bcdf8816cffb6a63869803f5c6` | 2026-09-20 | [AI-303] google_adk_agents: graph workflows, dynamic workflows, and durable HITL (ADK v2) (#1675) |

### 1.2 Documentation (read via docs.temporal.io, 2026-09-23)

- `https://docs.temporal.io/workflows` — Workflow definition/execution, replay model, replay-safe APIs.
- `https://docs.temporal.io/activities` — Activity definition/execution, heartbeat details, local activities, idempotency guidance.
- `https://docs.temporal.io/encyclopedia/retry-policies` — Retry policy defaults, per-error next-retry delay, non-retryable errors, event-history noise suppression during retries.
- `https://docs.temporal.io/develop/typescript/workflows/message-passing` — Signals/queries/updates, setHandler single-handler semantics.
- Web-verified: workflow ID reuse policy (AllowDuplicate / AllowDuplicateFailedOnly / RejectDuplicate / TerminateIfRunning; newer `id-conflict-policy`: Fail / UseExisting / TerminateExisting); activity timeout taxonomy (ScheduleToStart / StartToClose / ScheduleToClose / Heartbeat); history limits (warn 10,240 events, hard 51,200 events, 2,000 updates, 10,000 signals); versioning three-phase patch lifecycle (`patched` / `deprecatePatch` / remove); sticky execution as pure performance optimization; cancellation types (WAIT_CANCELLATION_COMPLETED / TRY_CANCEL / ABANDON); cancel vs terminate; reset; continue-as-new.

### 1.3 Notable: Temporal is shipping agent-loop durability natively

sdk-python HEAD contains `temporalio/contrib/{openai_agents, deepagents, strands, google_adk_agents, google_genai}/workflow.py`. The `deepagents` contrib docstring states the design explicitly: the agentic loop runs *inside* the workflow; every model/tool/backend dispatch goes through dispatch helpers that each run their own Activity; only executions recorded before the `deepagents.retire-result-cache` patch consult a continue-as-new result cache during replay; checkpointers that do their own I/O are not replay-safe from workflow code. **This is the strongest evidence available that Temporal's answer to LLM agents is: put the loop in the workflow, push every nondeterministic hop into an activity, record everything.** The boundary of that answer is dissected in Section 3.

---

## 2. Mechanisms (canonical format)

For every mechanism: **failure class first**, then the canonical fields.

---

### M-1 · Deterministic event-sourced replay

**WHAT FAILURE CLASS DOES THIS SOLVE?** Worker/process death mid-orchestration, and any restart: the orchestrator's in-memory state is gone, but the mission must resume exactly where it stopped without re-executing completed effects.

- **PROBLEM:** A multi-day mission's coordinator keeps progress in process memory (cursors, flags, partial results). If the process dies, the replacement cannot reconstruct "what already happened" vs "what to do next" without re-doing work or skipping steps.
- **FAILURE_CLASS_SOLVED:** crash-stop failure of the orchestration host; state-loss on restart; duplicate side-effect execution after failover.
- **SOURCE:** docs.temporal.io/workflows ("How Workflow replay works"); sdk-go `internal/internal_task_handlers.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/internal_task_handlers.go` — workflow task handler re-executes workflow code from the beginning against the recorded Event History; `docs.temporal.io/workflows` L44–L103: "Temporal doesn't restore memory from a snapshot. It starts the Workflow code from the beginning, replays the Event History step by step... uses the recorded events instead of redoing work."
- **MATURITY:** Production, ~7 years, multi-language; the core of the system.
- **INVARIANT:** *Same code + same history → same commands, same state.* State is a pure fold over an append-only event log; there is no snapshot restore.
- **IMPLEMENTATION:** Workflow code must be deterministic; every interaction with the outside world goes through Activities whose results are recorded once in history and reused on replay (never re-executed). Workflow tasks (the unit of orchestration progress) retry until the workflow execution timeout, which is unlimited by default.
- **FAILURE_MODE:** Replay is O(history length) — long histories are expensive to fold (mitigated by M-15 sticky cache and M-10 continue-as-new). If code changed incompatibly, replay panics with nondeterminism error (M-2) and the workflow task retries until a code fix or reset (M-16) — the system prefers stalling over diverging.
- **PING_EXISTING_ANALOG:** PING's event journal (`ping_runtime` / `crx_runtime` PG databases; `mission_events` tables exist but are currently 0 rows per the 2026-09-23 capability matrix) and projection philosophy (Oracle is the window, event plane is the recorder). MissionRuntime missions use idempotent deterministic IDs (per the Orca comparison doc).
- **GAP:** PING records events but does not *reconstruct live orchestration state by folding them* — `mission_executions` is 0 rows; there is no "resume a dead mission by replaying its event history" path. Events are currently observability, not a recovery substrate.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Kill the coordinator process mid-mission; a fresh process must reconstruct the mission's exact pending/completed frontier from the event journal alone, with zero coordinator-side explanation, and resume without re-emitting any completed effect.
- **DEPENDENCIES:** M-2 (mismatch detection), M-4 (identity), M-5 (retries on the effect side).
- **PING_REPRODUCIBLE?** Partial. PING has the event plane and deterministic IDs. Missing: the discipline that orchestration code is a pure fold over history (no ad-hoc memory that matters), and the "re-run from zero against history" recovery path. The fold is the missing piece, not the log.

---

### M-2 · Replay command/history mismatch detection (nondeterminism tripwire)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Silent divergence: code or environment changes that would make a resumed run take different actions than the original run did — the class of bug that corrupts state quietly instead of crashing loudly.

- **PROBLEM:** After a deploy, replayed workflow code might emit a different command sequence than history records (reordered activities, removed timer, new branch). Executing the new commands against old state produces corruption that looks like progress.
- **FAILURE_CLASS_SOLVED:** Byzantine-ish code-version skew during recovery; environment nondeterminism (clock, RNG, network in orchestration code).
- **SOURCE:** sdk-go `internal/internal_task_handlers.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/internal_task_handlers.go:1580` `matchReplayWithHistory` — zips replayed commands against history events and returns `[TMPRL1100] nondeterministic workflow: missing replay command for %s` / `extra replay command for %s` / `history event is %s, replay command is %s`. Command matching is type+identity aware (`isCommandMatchEvent`, line 1642: e.g. ScheduleActivity matches only if activity ID and type name match).
- **MATURITY:** Production; the error code prefix `[TMPRL1100]` indicates a cataloged, stable diagnostic.
- **INVARIANT:** *Any divergence between what the code would do now and what history says it did is a hard failure, never a silent merge.* Fail closed on mismatch.
- **IMPLEMENTATION:** After re-execution, the SDK compares the emitted command list to the history events pairwise, skipping only explicitly version-marked regions (see M-14: `skipDeterministicCheckForUpsertChangeVersion`). Mismatch fails the *workflow task* (retried with backoff), not the workflow — the workflow is suspended until code or history is reconciled, which prevents cascading corruption.
- **FAILURE_MODE:** False positives are possible if a developer emits commands in a data-dependent order they didn't realize was nondeterministic (e.g. iterating a Go map). The system errs toward halting; recovery requires versioning (M-14) or reset (M-16). Debugging requires reading history diffs (`temporal workflow replay`).
- **PING_EXISTING_ANALOG:** SOUL.md §11 ("never confuse nothing exists with failed to find it") and typed failure semantics as doctrine; crx-autonomous-missions verdict-authority admission checks.
- **GAP:** PING has no equivalent of "re-derive the next actions from durable state and verify they match what was previously decided." Resumed agents re-plan freely with no tripwire against plan divergence.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Deploy a prompt/code change mid-mission that alters the planned step sequence; the resumed run must *halt with a named divergence error* rather than silently executing the new plan against the old state. (Note: for LLM planners this tripwire needs scoping — see Section 3.)
- **DEPENDENCIES:** M-1.
- **PING_REPRODUCIBLE?** Partial. The *check* (compare re-derived intent against recorded intent) is implementable on PING's event plane. The hard part is defining what "same plan" means for an LLM planner — a structural (typed step list) comparison, not a token comparison.

---

### M-3 · Sandbox determinism enforcement (static + runtime import/call interdiction)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Developer-introduced nondeterminism: orchestration code calling `datetime.now()`, `random.random()`, or doing I/O directly, which would pass tests and fail only on replay after a crash.

- **PROBLEM:** Determinism-by-convention fails at scale; someone will call the wall clock in orchestration code. The failure surfaces only during recovery — the worst time to discover it.
- **FAILURE_CLASS_SOLVED:** latent nondeterminism defects; environment coupling in orchestration code.
- **SOURCE:** sdk-python `temporalio/worker/workflow_sandbox/`.
- **PINNED_SHA:** sdk-python `eb642b14947bd8bcdf8816cffb6a63869803f5c6`.
- **SOURCE_LOCATION:** `temporalio/worker/workflow_sandbox/_restrictions.py` — `RestrictedWorkflowAccessError(temporalio.workflow.NondeterminismError)`; `_importer.py` — custom module importer that restricts builtins (`_builtins_restricted`) and rewrites/restricts modules at import time. Deterministic replacements are provided instead: `workflow.now()` (`_context.py:796`), `workflow.new_random()` (`_context.py:882`).
- **MATURITY:** Production in Python SDK; analogous (stricter) VM sandboxing in TypeScript SDK; Go relies on code review + replay-safe API surface instead of a sandbox.
- **INVARIANT:** *Orchestration code cannot reach nondeterministic or I/O-capable APIs except through blessed deterministic facades.* Violation raises at definition/import time, not at recovery time.
- **IMPLEMENTATION:** Workflows execute in a sandboxed interpreter context. The importer intercepts module loads; restricted stdlib members (time, random, socket, etc.) are replaced or raise `RestrictedWorkflowAccessError`. Blessed facades (`workflow.now()`, `workflow.new_random()`, `workflow.sleep()`) return values seeded/recorded from history.
- **FAILURE_MODE:** Sandbox escapes via `workflow.unsafe.is_sandbox_unrestricted()` exist and are audited; over-restriction blocks legitimate libraries (the SDK maintains pass-through lists). It cannot catch *semantic* nondeterminism (e.g. depending on dict ordering from an activity payload — actually deterministic if payload is; or an LLM's output used as control flow — see Section 3).
- **PING_EXISTING_ANALOG:** PING's default-deny capability plane (capability matrix §4: "Silence is denial"; every role starts with NOTHING). Agent operating model constraints.
- **GAP:** PING's capability grants are enforced at the *tool-call* layer, not at the *planning-code* layer. There is no "orchestration code may not import socket" gate for mission logic.
- **HARVEST_CLASS:** STUDY (high value, but needs care: PING's orchestration *is* LLM output, which a sandbox cannot fully constrain — see Section 3).
- **FALSIFICATION:** Submit mission-planning code that calls wall-clock/RNG/network directly; the harness must reject it before first execution, with a named error, not during recovery.
- **DEPENDENCIES:** M-1 (only meaningful if replay exists).
- **PING_REPRODUCIBLE?** Partial. PING can enforce deterministic facades for *deterministic helper code* (Python sandbox or lint gates exist as libraries). It cannot sandbox the LLM's own reasoning — the analog only covers code the agent *writes*, not text the agent *generates*.

---

### M-4 · Workflow identity: Workflow ID + Run ID + ID reuse/conflict policy

**WHAT FAILURE CLASS DOES THIS SOLVE?** Duplicate mission execution (double-start after a client retry / operator double-click) and identity collision across restarts — the "did we already start this?" problem.

- **PROBLEM:** A client retries a start request because of a network timeout; the server actually started the mission. Without identity dedup, the mission runs twice with real-world side effects.
- **FAILURE_CLASS_SOLVED:** at-least-once start delivery producing duplicate executions; ambiguous mission identity after crash/restart.
- **SOURCE:** Temporal docs (workflow ID reuse policy); temporal CLI reference.
- **PINNED_SHA:** n/a (docs-level semantic; corroborated in every SDK's client API).
- **SOURCE_LOCATION:** docs.temporal.io tctl-v1/workflow `--workflowidreusepolicy`: `AllowDuplicate` (default) / `AllowDuplicateFailedOnly` (only if last close ∈ {terminated, cancelled, timed out, failed}) / `RejectDuplicate` (never); newer `--id-reuse-policy` adds `TerminateIfRunning`; `--id-conflict-policy`: `Fail` / `UseExisting` / `TerminateExisting`. Invariant: *it is never valid to have two actively running instances of the same workflow ID.*
- **MATURITY:** Production, stable across SDKs.
- **INVARIANT:** *A business-meaningful ID maps to at most one open execution, ever.* The ID is the deduplication key; the Run ID distinguishes attempts over time (continue-as-new chains, retries of the whole run).
- **IMPLEMENTATION:** Start requests carry the workflow ID; the server atomically checks for an open execution with that ID. Reuse policy governs what may follow a *closed* execution. Conflict policy governs what happens when a start races an *open* one.
- **FAILURE_MODE:** `RejectDuplicate` within retention only — after history retention expires, the ID may be reused unknowingly. `TerminateIfRunning` is a sharp tool (kills in-flight work). Business-ID choice is the user's burden: a bad ID scheme (e.g. non-unique per real-world entity) silently merges distinct missions.
- **PING_EXISTING_ANALOG:** MissionRuntime missions use idempotent deterministic IDs (per Orca comparison doc); orca O-1 harvest proposed durable run rows with UUIDv7.
- **GAP:** Deterministic IDs exist for missions, but the *server-enforced* "at most one open execution per ID" with conflict/reuse policies is not enforced anywhere PING-side; duplicate mission starts after coordinator retry are possible.
- **HARVEST_CLASS:** ADOPT.
- **FALSIFICATION:** Issue two concurrent start requests with the same mission ID during a network partition; exactly one execution must proceed, and the loser must receive a deterministic already-started signal (not a silent second run).
- **DEPENDENCIES:** A durable registry with atomic compare-and-set (PING has PG).
- **PING_REPRODUCIBLE?** Yes. PG unique partial index on (mission_id) where status=open + a start path that does atomic insert-or-get. Low implementation cost.

---

### M-5 · Declarative retry policies

**WHAT FAILURE CLASS DOES THIS SOLVE?** Transient and intermittent dependency failures (flaky API, DNS blip, rate-limit 429, brief outage) killing a multi-day mission that would have succeeded on retry.

- **PROBLEM:** Hand-written retry loops scatter policy through business logic, get the backoff math wrong, retry non-retryable errors forever, and lose retry state on process death.
- **FAILURE_CLASS_SOLVED:** transient/intermittent failure of fallible steps; retry-state loss on crash.
- **SOURCE:** docs.temporal.io/encyclopedia/retry-policies (read 2026-09-23).
- **PINNED_SHA:** n/a (docs-level; SDKs share the schema).
- **SOURCE_LOCATION:** Retry policy schema: `initial_interval` (default 1s) × `backoff_coefficient` (default 2.0) capped at `maximum_interval` (default 100× initial), `maximum_attempts` (default 0 = unlimited), `non_retryable_error_types` (default none). Per-error override: an `ApplicationError` may carry `next_retry_delay`, replacing the computed interval. Docs: "Temporal's default behavior is to automatically retry an Activity... until it either succeeds or is canceled." Workflows do *not* retry by default — retry the fallible step, not the whole orchestration (docs: "retrying the whole Workflow would repeat the same logic without resolving the underlying issue").
- **MATURITY:** Production; the most-used Temporal primitive.
- **INVARIANT:** *Retry policy is data, not code; the platform owns the schedule and the attempt counter, and both survive crashes.* Retry is scoped to the fallible unit, never the whole run, by default.
- **IMPLEMENTATION:** Retry state lives server-side. During retries, `ActivityTaskStarted` is withheld from history until terminal outcome ("to avoid filling the Event History with noise"); attempt count is queryable via Describe. Workflow-level retries (when opted in) start a *new run* with the same workflow ID after backoff, recording `first_workflow_task_backoff`.
- **FAILURE_MODE:** Default is unlimited attempts — a permanently-failing activity retries forever (the #1 operator surprise; must bound with `maximum_attempts` or schedule-to-close timeout). Non-retryable classification is the caller's burden; misclassification either burns resources or surfaces transient errors. Thundering-herd on mass recovery unless jittered (SDKs add jitter).
- **PING_EXISTING_ANALOG:** crx-autonomous-missions typed failure semantics; bounded retries with evidence (Antifragile Execution Directive in AGENTS.md: "bounded retries with evidence").
- **GAP:** PING's retry discipline is doctrine, not machinery. There is no declarative per-step retry policy object with server-owned attempt counting that survives coordinator death.
- **HARVEST_CLASS:** ADOPT.
- **FALSIFICATION:** Configure max_attempts=3 with backoff; kill the coordinator between attempts 1 and 2; the fresh coordinator must attempt exactly #2 and #3 on schedule — no reset of the counter, no extra attempt, no lost attempt.
- **DEPENDENCIES:** M-4 (attempt identity), M-7 (timeouts bound the policy).
- **PING_REPRODUCIBLE?** Yes. Attempt counters and next-retry timestamps in PG, owned by the mission runtime rather than the worker. Straightforward.

---

### M-6 · Heartbeating with heartbeat details (progress checkpointing)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Long-running steps on dead workers: without liveness signal, the orchestrator cannot distinguish "still working" from "worker died silently," so it waits out the full timeout; and on retry, work restarts from scratch.

- **PROBLEM:** A 2-hour step dies at 1h59m with the worker. The orchestrator only learns at the start-to-close timeout, then retries from zero — 4 hours for 2 hours of work, repeatedly.
- **FAILURE_CLASS_SOLVED:** silent worker death during long steps; failure-detection latency; lost partial progress on retry.
- **SOURCE:** docs.temporal.io/activities; sdk-go `internal/internal_activity.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/internal_activity.go:397` `RecordHeartbeat(ctx, details...)`; `:417-424` `HasHeartbeatDetails` / `GetHeartbeatDetails` — the last recorded details are delivered to the *next attempt* of the activity. Docs: "The last recorded Heartbeat details are made available to the Activity function on the next attempt, so your code can continue processing where it left off." Heartbeating is also the *only* channel that can deliver cancellation to an already-running activity (community-verified: "For an activity to get canceled it must heartbeat").
- **MATURITY:** Production; the standard pattern for long activities.
- **INVARIANT:** *Liveness is proven by periodic signal, not by eventual completion; progress checkpoints ride on the liveness signal and are handed to the next attempt.* Absence of heartbeat within the heartbeat timeout ⇒ presumed dead ⇒ fail the attempt fast.
- **IMPLEMENTATION:** Activity code calls `RecordHeartbeat` with a progress payload (e.g. last processed offset). The SDK batches/throttles delivery to the server. The server enforces the heartbeat timeout: gap exceeded → attempt times out → retried (or the workflow's cancellation is delivered on the next heartbeat response). Next attempt reads `GetHeartbeatDetails` and resumes from the checkpoint.
- **FAILURE_MODE:** Checkpoint payloads must be small and serializable; a corrupt checkpoint poisons all future attempts (must be validated/defensive). Heartbeat timeout set too tight → false-positive kills under GC pauses/load. Activities that cannot checkpoint (non-resumable external calls) gain only faster failure detection, not progress preservation.
- **PING_EXISTING_ANALOG:** None durable. The Orca O-1 harvest noted "no heartbeat/lease yet" as the failure model of run rows. PING run state has no liveness/lease concept.
- **GAP:** PING workers have no heartbeat protocol; a dead worker's in-flight step is indistinguishable from a slow one, and partial progress is not checkpointed anywhere the next attempt can read.
- **HARVEST_CLASS:** ADOPT.
- **FALSIFICATION:** Run a 30-minute step that checkpoints every minute; kill the worker at minute 20; the replacement must resume from the minute-20 checkpoint (not from zero), and total wall-clock must be ≈ 30 + detection delay, not 50.
- **DEPENDENCIES:** M-5 (retry consumes the checkpoint), M-7 (heartbeat timeout).
- **PING_REPRODUCIBLE?** Yes. Heartbeat = periodic UPDATE of (worker_id, last_beat, progress_blob) on the attempt row; a sweeper marks attempts stale past the timeout. This is the single highest-value durability primitive PING lacks.

---

### M-7 · Activity timeout taxonomy (four timeouts, two clocks)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Ambiguous slowness: conflating "queued too long" (capacity problem), "one attempt too slow" (bug/hang), "whole step too slow" (policy violation), and "worker silently dead" (liveness problem) into one mushy timeout.

- **PROBLEM:** A single "timeout" cannot distinguish a saturated worker pool from a hung step from a dead worker, so operators cannot diagnose or set policy correctly.
- **FAILURE_CLASS_SOLVED:** misattributed latency; unbounded step duration; undetected worker-pool saturation.
- **SOURCE:** Temporal docs (activity timeouts), corroborated by multiple SDK references.
- **PINNED_SHA:** n/a (cross-SDK schema).
- **SOURCE_LOCATION:** Four timeouts: `ScheduleToStart` (queue wait — detects under-provisioned/dead worker pools; "rarely needed"), `StartToClose` (single attempt — "we recommend ALWAYS setting this"), `ScheduleToClose` (whole execution incl. retries — the overall deadline), `Heartbeat` (max gap between heartbeats — fast dead-worker detection). Constraint: either `ScheduleToClose` or both `ScheduleToStart`+`StartToClose` is required. "Temporal does not impose any system limit on activity duration. It is up to the application to choose the timeouts."
- **MATURITY:** Production, stable schema for years.
- **INVARIANT:** *Queue time, attempt time, total time, and liveness are four separate clocks with four separate policies.* Each timeout names a distinct failure and a distinct owner.
- **IMPLEMENTATION:** Timeouts are declared up front in activity options and enforced server-side; `ActivityTaskTimedOut` is written to history on fire.
- **FAILURE_MODE:** Misconfigured combinations (e.g. StartToClose longer than ScheduleToClose) silently neuter the tighter bound. ScheduleToStart too tight causes spurious timeouts during deploys. No timeout on "total mission time" at this layer (that's the workflow execution timeout).
- **PING_EXISTING_ANALOG:** Mission/task authority grants with scopes (capability matrix) — policy-as-data exists, but no temporal policy taxonomy.
- **GAP:** PING has no structured per-step temporal policy distinguishing queue wait vs attempt duration vs total deadline vs liveness gap.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Saturate the worker pool (steps queue but don't start): the system must report "schedule-to-start exceeded" (capacity), not "step failed" (logic). Hang a step with a live worker: must report "start-to-close exceeded" (attempt), not liveness failure.
- **DEPENDENCIES:** M-5, M-6.
- **PING_REPRODUCIBLE?** Yes. Four timestamp columns + a sweeper; the taxonomy is the insight, the machinery is trivial.

---

### M-8 · Durable timers (server-owned sleep)

**WHAT FAILURE CLASS DOES THIS SOLVE?** "Sleep for 3 days then continue" across crashes: process-local sleep dies with the process, and cron-style polling wastes resources and loses exactness.

- **PROBLEM:** A mission needs "wait 48h for the review, then escalate." If the coordinator sleeps in-process, a restart loses the deadline. If it polls, it burns resources for days and still has a gap.
- **FAILURE_CLASS_SOLVED:** deadline loss on restart; polling waste for long waits.
- **SOURCE:** docs.temporal.io (durable timers); community-verified behavior.
- **PINNED_SHA:** n/a.
- **SOURCE_LOCATION:** Docs + community (mjmoshiri/learnings): "Durable Timers are tracked by the Cluster, not the Worker. If a Workflow crashes and the Worker restarts it, the timer doesn't reset, it keeps counting from when it first started, because that start time lives in the event history on the server side." In history: `TimerStarted` → `TimerFired` events; during replay the timer does not "wait" again.
- **MATURITY:** Production.
- **INVARIANT:** *A scheduled wakeup is a durable fact owned by the substrate, not a thread sleeping in a worker.* Restart never resets or loses the deadline.
- **IMPLEMENTATION:** Workflow code calls sleep; SDK emits `StartTimer` command; server records `TimerStarted` with the fire time and produces `TimerFired` when due, waking the workflow via a new workflow task. Replay sees both events and continues instantly.
- **FAILURE_MODE:** Timer storms (thousands of timers firing at once) load the task queue; very long timers interact with history retention (prefer continue-as-new for multi-month waits); clock skew between server nodes is a server concern, not SDK.
- **PING_EXISTING_ANALOG:** Cron jobs (`cron.*` tooling) for scheduled passes; 2-day sprint revert cron fires 2026-09-25 09:00 MDT.
- **GAP:** PING's crons are *schedule-based* (fire at times), not *mission-scoped deadlines* ("this mission wakes in 48h even if everything restarts"). No per-mission durable timer primitive.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Start a mission with a 10-minute deadline step; kill all workers at minute 5; restart at minute 9; the step must fire at minute 10 (± small skew), not 10 minutes after restart, and never be lost.
- **DEPENDENCIES:** M-1 (timer events participate in replay).
- **PING_REPRODUCIBLE?** Yes. `wake_at` timestamp on the mission/step row + a sweeper that enqueues due wakeups. PG is the timer owner.

---

### M-9 · Cancellation model (graceful cancel vs terminate; scopes; disconnected context)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Unstoppable runaway missions and dirty aborts: an operator must be able to stop a mission *gracefully* (finish the in-flight step, run cleanup, release resources) or *immediately* (hard stop, no cleanup), and mission code must be able to shield cleanup work from the cancellation itself.

- **PROBLEM:** `kill -9` on a mission that holds external resources (open PRs, sent emails, locked rows) leaves the world dirty. But graceful shutdown requires the cancellation to be *observable* by the code being cancelled, and cleanup code must not itself be cancelled.
- **FAILURE_CLASS_SOLVED:** runaway resource consumption; dirty abort leaving external side effects half-done; cascading cancellation (or lack thereof) across sub-missions.
- **SOURCE:** Temporal docs + community; sdk-go `internal/context.go`, `internal/error.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/context.go:197` `NewDisconnectedContext` — creates a context not linked to cancellation, for cleanup. Community-verified semantics: `CancelWorkflow` cancels the root workflow context (in-flight activity may finish; remaining steps are skipped unless run under a disconnected context); `TerminateWorkflow` stops everything immediately with no cleanup. Activity cancellation types: `WAIT_CANCELLATION_COMPLETED` / `TRY_CANCEL` / `ABANDON` — and "for an activity to get canceled it must heartbeat, as heartbeating is the only way at this point to send information to an already executing activity."
- **MATURITY:** Production.
- **INVARIANT:** *Cancellation is cooperative and observable; termination is not.* Cleanup runs under a cancellation-shielded context. Cancellation propagates down scopes; each scope decides whether to shield, propagate, or abandon.
- **IMPLEMENTATION:** Cancellation arrives as an event; the SDK cancels the root context/scope. Workflow code catches `CanceledError` and runs compensation under `NewDisconnectedContext`. Child workflows inherit cancellation per parent-close policy (M-12); activities only learn of cancellation via heartbeat responses, with three policies for how the workflow waits (or doesn't) for the activity to acknowledge.
- **FAILURE_MODE:** Code that ignores context cancellation is uncancellable (graceful cancel degrades to "waits for the step"). `ABANDON` leaks the activity (still running, result discarded). Disconnected-context cleanup that itself hangs needs its own timeout. Terminate is irreversible and unaudited by default (reason string recommended).
- **PING_EXISTING_ANALOG:** Standing law §3: adversarial kill tests (synthetic first); kill semantics discussed for workers. No structured cancel/terminate distinction.
- **GAP:** PING has no graceful-cancel protocol: no cooperative cancellation signal to in-flight steps, no shielded-cleanup context, no cancel-vs-terminate distinction, no per-step cancellation policy.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Cancel a mission mid-step: the in-flight step must observe cancellation within one heartbeat interval, run its compensation (releasing the external resource), and the mission must close as *cancelled* with an audit trail — not as *failed*, not silently. Terminate must stop within seconds with no cleanup attempted.
- **DEPENDENCIES:** M-6 (heartbeat carries cancellation), M-12 (propagation to children).
- **PING_REPRODUCIBLE?** Partial. Cancel-as-event + heartbeat delivery is reproducible. The subtle part is *language-level* cooperative cancellation (context/scope plumbing through every step); PING would need it in the worker runtime, not just the schema.

---

### M-10 · Continue-as-new (bounded history via chained runs)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Unbounded history growth in never-ending missions: an event log that grows forever eventually hits storage/compute limits and makes replay O(n) on every step.

- **PROBLEM:** A mission that runs for weeks (agent loop, monitor loop) appends events per iteration. Temporal terminates executions past 51,200 events / 50MB history. Without a rollover, long missions are *guaranteed* to be killed.
- **FAILURE_CLASS_SOLVED:** history-exhaustion termination; replay-cost blowup; version-pinning of ancient code (old runs replay old code forever).
- **SOURCE:** Temporal docs (event history limits); sdk-go `internal/error.go:640` `NewContinueAsNewError`; sdk-python `temporalio/workflow/_workflow_ops.py:722+`.
- **PINNED_SHA:** both SHAs above.
- **SOURCE_LOCATION:** Docs: warn at 10,240 events, terminate at 51,200 events / >2,000 updates / >10,000 signals; server suggests continue-as-new at 4MB / 4,096 events (`limit.historyCount.suggestContinueAsNew`), surfaced to SDKs as `continueAsNewSuggested`. Semantics: same Workflow ID, new Run ID, fresh history; the new run receives the workflow's normal input args (current state passed forward explicitly); "part of the same Workflow Execution Chain."
- **MATURITY:** Production; the standard pattern for long-lived agents (multiple production agent harnesses use turn-count backstops, e.g. 2,000 turns).
- **INVARIANT:** *No single run's history may grow without bound; rollover is explicit, state is carried forward as input, and the chain preserves identity.*
- **IMPLEMENTATION:** Workflow code calls continue-as-new at a safe boundary (no in-flight activities, handlers drained); the current run closes with `ContinuedAsNew`, the server atomically starts the next run with the supplied input. SDKs expose `workflowInfo().continueAsNewSuggested`.
- **FAILURE_MODE:** State that lives only in memory (not passed as input) is lost across the boundary — the #1 bug (production harnesses guard: "only continueAsNew when no turn is mid-flight and queues are drained"). Signals/updates arriving during rollover must be drained or re-targeted. Over-frequent rollover churns runs; under-frequent risks termination.
- **PING_EXISTING_ANALOG:** Conversation compaction (context summarization) is a lossy analog of state carry-forward. No durable chained-run concept.
- **GAP:** PING missions have no history bound and no rollover primitive; a weeks-long mission's journal grows unboundedly with no mechanism to compact-and-continue under the same identity.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Run a mission past the history threshold; it must roll over to a new run under the same mission ID with state intact, zero lost in-flight work, and the old run's history must remain queryable as part of the chain.
- **DEPENDENCIES:** M-4 (identity chain), M-1 (replay within each run).
- **PING_REPRODUCIBLE?** Yes — arguably the most natural PING harvest: new `mission_executions` row, same mission ID, state snapshot as input, chain link recorded. Requires the state-carry discipline (what is "state" must be explicit, not ambient memory).

---

### M-11 · Signals / queries / updates (three inbound message shapes)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Blind long-running missions: no way to inject new information mid-run (signal), inspect progress without disturbing it (query), or request a validated state change with a reply (update) — forcing operators to kill-and-restart to steer.

- **PROBLEM:** A mission runs for days. The world changes (new priority, approval granted, bad input discovered). Without inbound messaging, the only control is kill.
- **FAILURE_CLASS_SOLVED:** unsteerable long runs; observability requiring side channels; unvalidated external mutation of mission state.
- **SOURCE:** docs.temporal.io/develop/typescript/workflows/message-passing; swift SDK signals example; community agent-harness docs.
- **PINNED_SHA:** n/a (cross-SDK).
- **SOURCE_LOCATION:** Three shapes: **Signal** — async, one-way, no return, durable (recorded in history; "Each event is a Temporal Signal in workflow history, so the log is offset-addressed and reconstructed deterministically on replay"). **Query** — sync, read-only, answered from current state without touching history. **Update** — sync, validated mutation with accept/reject and a return value (validator runs before the mutation is admitted). Handlers: `setHandler` — one handler per name (replacing, not subscribing).
- **MATURITY:** Signals/queries production for years; updates GA more recently.
- **INVARIANT:** *Inbound communication is typed by intent: notify (signal), inspect (query), or validated-mutate-with-reply (update).* Signals are durable history; queries never mutate; updates never apply without validation.
- **IMPLEMENTATION:** Signals/updates are events in history (replay-safe; handlers run during replay to rebuild state). Queries are served from the worker's current in-memory state (or re-played state) without appending history. Updates have a two-phase validator + handler.
- **FAILURE_MODE:** Signal storms (10,000-signal history limit); query handlers that accidentally mutate or block; updates to a workflow mid-continue-as-new (must drain first); handler code must be deterministic like all workflow code.
- **PING_EXISTING_ANALOG:** PING has events and projections; hooks (event-driven automations) are a signal-ish inbound path. No query/update triad against a live mission.
- **GAP:** No durable "send a message into a running mission" primitive; no read-only introspection API against live mission state; no validated-mutation-with-reply (e.g. human approval) primitive.
- **HARVEST_CLASS:** ADAPT (updates especially: the validated-mutation shape is exactly human-in-the-loop approval).
- **FALSIFICATION:** Send "pause" to a running mission; after coordinator kill/restart, the mission must still be paused (signal was durable), and a status query must report `paused` without perturbing execution.
- **DEPENDENCIES:** M-1 (signals/updates are history), M-9 (pause/cancel are signals/updates).
- **PING_REPRODUCIBLE?** Partial. Signals-as-events and queries-against-projection are reproducible on PING's plane. Updates need the validator-then-apply atomicity against live worker state — harder without a workflow-task-like execution model.

---

### M-12 · Child workflows + parent close policy (scoped sub-mission lifecycle)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Orphaned or ambiguously-owned sub-work: a parent mission spawns sub-missions and then is cancelled/terminated/completed — what happens to the children must be policy, not accident.

- **PROBLEM:** Parent spawns 5 sub-agents, then the operator cancels the parent. Do the children keep running (wasting money, acting on a dead mission's authority)? Are they killed mid-side-effect? The answer cannot be "whatever the scheduler felt like."
- **FAILURE_CLASS_SOLVED:** orphaned sub-missions; ambiguous cleanup ownership; authority leakage after parent death.
- **SOURCE:** sdk-go `internal/internal_event_handlers.go:605` (`attributes.ParentClosePolicy = params.ParentClosePolicy`); Temporal docs.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `ParentClosePolicy` enum: `TERMINATE` / `ABANDON` / `REQUEST_CANCEL`, set at child-start time. Cancellation also propagates parent→child by default (cancellable scopes), with per-child override.
- **MATURITY:** Production.
- **INVARIANT:** *Every spawned sub-execution declares at birth what the parent's death means for it.* No implicit orphans, no implicit kills.
- **IMPLEMENTATION:** Policy recorded in the child's start event; the server enforces it when the parent closes. Independent of the child's own retry/cancel behavior.
- **FAILURE_MODE:** `ABANDON` children outlive their mission's authority grant — needs grant-expiry to be safe (PING's capability grants are mission-scoped; an abandoned child must not retain them). `TERMINATE` on a child mid-side-effect needs the child's own compensation (M-9).
- **PING_EXISTING_ANALOG:** Subagents (depth-limited spawning); task-authority grants are mission-scoped (capability matrix §4).
- **GAP:** PING subagent lifecycle on parent cancellation is implicit (session teardown), not a declared per-spawn policy.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Cancel a parent with one TERMINATE child doing a 10-minute step and one ABANDON child: the first must be cancelled (with compensation), the second must continue — and the second's authority grant must be re-scoped or expired, provably.
- **DEPENDENCIES:** M-9.
- **PING_REPRODUCIBLE?** Yes. A `parent_close_policy` column on the child-mission row + enforcement in the mission runtime's close path.

---

### M-13 · SideEffect / MutableSideEffect (record-once nondeterminism)

**WHAT FAILURE CLASS DOES THIS SOLVE?** The small, legitimate nondeterminisms orchestration genuinely needs (a UUID, a random choice, a config fetch) breaking replay determinism.

- **PROBLEM:** Workflow code needs a UUID for an idempotency key. `uuid.New()` differs on every replay → command mismatch → M-2 tripwire fires on legitimate code.
- **FAILURE_CLASS_SOLVED:** replay breakage from necessary nondeterminism.
- **SOURCE:** sdk-go `internal/workflow.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/workflow.go:2310` `SideEffect` — "executes the provided function once, records its result into the workflow history. The recorded result on history will be returned without executing the provided function during replay." `internal/workflow.go:2375` `MutableSideEffect(id, f, equals)` — records a named value once; on replay re-evaluates `f` and only records a new marker if `equals` says it changed. Markers: `sideEffectMarkerName` / `mutableSideEffectMarkerName` (`internal/internal_event_handlers.go:1713,1748`).
- **MATURITY:** Production.
- **INVARIANT:** *Nondeterminism is allowed exactly once per named site; thereafter the recorded value is truth.* The escape hatch is itself durable and replay-aware.
- **IMPLEMENTATION:** First execution runs `f` (in a read-only-elevated section), records the encoded result as a Marker event. Replay short-circuits to the recorded value. `MutableSideEffect` adds change detection so config-like values can evolve without breaking replay.
- **FAILURE_MODE:** SideEffect closures must not mutate workflow state ("Caution: do not use MutableSideEffect to modify closures"). Overuse hides real nondeterminism (everything becomes a side effect → replay is vacuous). Marker events count toward history limits.
- **PING_EXISTING_ANALOG:** None as machinery. Closest: idempotency keys / deterministic IDs.
- **GAP:** No named record-once primitive for orchestration-level nondeterminism.
- **HARVEST_CLASS:** STUDY (valuable once M-1/M-2 exist; premature without them).
- **FALSIFICATION:** Generate an idempotency key via the primitive; kill/restart mid-mission; the resumed run must reuse the identical key (not generate a new one), provable from the journal.
- **DEPENDENCIES:** M-1, M-2.
- **PING_REPRODUCIBLE?** Yes, trivially: named key-value rows in the mission journal written once, read on resume.

---

### M-14 · Versioning: patch markers, deprecate-patch lifecycle, worker build IDs

**WHAT FAILURE CLASS DOES THIS SOLVE?** Deploying new orchestration code while old missions are in flight: without versioning, the new code's replay of old histories trips M-2 and stalls every open mission until someone intervenes.

- **PROBLEM:** The mission logic must change (bug fix, new step). 40 missions are mid-flight on the old logic. Deploying the new code breaks their replay.
- **FAILURE_CLASS_SOLVED:** deploy-induced mass stall of in-flight missions; unplanned coupling between deploy cadence and mission duration.
- **SOURCE:** sdk-go `internal/workflow.go:2485` `GetVersion`; sdk-python `temporalio/workflow/_context.py:809` `patched`, `:584` `deprecate_patch`; `internal/internal_event_handlers.go:1725` `versionMarkerName`.
- **PINNED_SHA:** both SHAs.
- **SOURCE_LOCATION:** `GetVersion(ctx, changeID, minSupported, maxSupported)` / `patched(id)`: on first execution records a `Version` marker in history; on replay, presence/absence of the marker selects the old/new branch deterministically. Three-phase lifecycle: (1) patch in — both branches; (2) `deprecatePatch` — marker recorded that tolerates replay without the old branch, after old runs drain; (3) remove. `TemporalChangeVersion` search attribute lets operators find runs by patch. Worker Versioning (build IDs) routes tasks to compatible workers at the deployment layer.
- **MATURITY:** Production; the patch lifecycle is the documented safe-deploy path.
- **INVARIANT:** *Code change is a branch selected by history, not by deploy time.* A run forever replays the logic it started with unless explicitly migrated.
- **IMPLEMENTATION:** Version markers are history events; the mismatch checker (M-2) skips regions covered by version markers (`skipDeterministicCheckForUpsertChangeVersion`). Deprecation markers make the transition one-directional.
- **FAILURE_MODE:** Forgetting phase 2/3 accumulates dead branches (version debt). Patching the wrong granularity (per-line instead of per-behavior) explodes marker count. Worker build-ID versioning misconfiguration routes new tasks to old workers silently.
- **PING_EXISTING_ANALOG:** BASELINE-FREEZE docs; deployment_registry table (0 rows — planned, not live).
- **GAP:** No mechanism to change mission logic safely under in-flight missions; deploys and mission semantics are implicitly coupled.
- **HARVEST_CLASS:** STUDY (needs M-1/M-2 first; but the *discipline* — history-selected branching — is worth adopting as doctrine early).
- **FALSIFICATION:** Deploy new mission logic while 5 missions are mid-flight; all 5 must complete on the old logic without stalling, and new missions must use the new logic; queryable by version.
- **DEPENDENCIES:** M-1, M-2.
- **PING_REPRODUCIBLE?** Partial. The marker/branch machinery is reproducible; the hard part is that PING's "code" is often prompts, and prompt-version branching needs the prompt text versioned as data (doable) with the branch selected by journal (doable).

---

### M-15 · Sticky execution (cache as pure optimization)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Replay cost: without it, every orchestration step of a long mission re-folds the entire history — O(n) work per step, crushing the substrate under its own audit trail.

- **PROBLEM:** M-1's "re-run from zero" is correct but expensive: 10,000 events folded to make the 10,001st decision, on every step.
- **FAILURE_CLASS_SOLVED:** recovery-path performance collapse (correctness preserved, latency destroyed).
- **SOURCE:** sdk-go `internal/internal_worker.go`; community/operator docs.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/internal_worker.go:375-377` (stickyUUID), `:505-512` — sticky task poller routes a run's next workflow task back to the same worker holding its cached state; the worker then needs only the events since it last ran. Operator runbooks track `temporal_sticky_cache_hit/miss/size` and forced evictions.
- **MATURITY:** Production, default-on.
- **INVARIANT:** *The cache is never a source of truth.* Correctness is identical with the cache on or off; a dead/sticky-expired worker falls back to full replay from the normal queue. Sticky routing is a lease (sticky task queue timeout), not a pin.
- **IMPLEMENTATION:** After a worker completes a workflow task, the server routes the next task for that run to a worker-specific sticky queue. The worker keeps the folded state in memory. On cache miss/eviction/timeout, full replay from history. Metrics distinguish hit vs miss.
- **FAILURE_MODE:** Undersized cache → forced evictions → replay storms under load (a known incident pattern: "a queue problem becomes a replay problem"). Sticky queues can strand tasks briefly if a worker dies just before the lease expires (bounded by the sticky timeout, ~seconds).
- **PING_EXISTING_ANALOG:** Conversation context = an implicit sticky cache (the coordinator holds folded state in memory). Compaction = lossy eviction.
- **GAP:** PING's "cache" (context) has no defined miss path: when context is lost or compacted, there is no full-replay-from-journal fallback — state is partially reconstructed by summarization, which is lossy, unlike Temporal's lossless replay.
- **HARVEST_CLASS:** ADAPT (the invariant matters more than the mechanism: *any* in-memory mission state must have a lossless replay fallback).
- **FALSIFICATION:** Drop the coordinator's entire in-memory state mid-mission (not just the process — the state); the mission must continue with zero behavioral difference versus the cached path, provable by diffing subsequent emitted events.
- **DEPENDENCIES:** M-1.
- **PING_REPRODUCIBLE?** Yes as an invariant; the mechanism (sticky routing) is only needed at scale PING doesn't have yet. Adopt the invariant now, the routing later.

---

### M-16 · Workflow reset (replay from event N)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Unrecoverable-but-understood bad states: a bug wrote bad decisions into history, or nondeterminism tripped with no compatible code path — the mission is wedged and neither retry nor versioning un-wedges it.

- **PROBLEM:** A bad deploy ran for an hour writing bad activity results into history before anyone noticed. The history is now "correctly recorded" but semantically wrong; continuing replays the wrongness.
- **FAILURE_CLASS_SOLVED:** poisoned history; wedged missions with no forward path.
- **SOURCE:** Temporal docs/CLI; community ops guides.
- **PINNED_SHA:** n/a (server-side).
- **SOURCE_LOCATION:** `temporal workflow reset --workflow-id --event-id N --reason` — replays the workflow from a chosen event, with `--reapply-type` controlling whether signals/updates after N are reapplied. Docs pattern: reset to just before the most recent failure, or to `LastWorkflowTask`.
- **MATURITY:** Production; standard incident response.
- **INVARIANT:** *History is append-only, but a new run may be forked from any prefix of it.* The bad suffix is abandoned, not rewritten — the audit trail survives.
- **IMPLEMENTATION:** Server creates a new run whose history is the prefix up to event N (plus reapplied signals per policy); the old run is terminated. Deterministic replay then proceeds from the prefix.
- **FAILURE_MODE:** External side effects already performed in the abandoned suffix are NOT undone — reset is not compensation (that's saga/M-9 territory). Reapply-type misconfiguration drops signals. Resetting past a continue-as-new boundary has sharp edges.
- **PING_EXISTING_ANALOG:** None. PING has no "fork a mission from journal prefix N" operation.
- **GAP:** A poisoned mission journal is fatal today; the only recovery is manual reconstruction.
- **HARVEST_CLASS:** STUDY (powerful but needs M-1/M-10 first; and the "side effects aren't undone" caveat must be front-and-center).
- **FALSIFICATION:** Poison a mission's journal with a bad decision at event 50 of 100; reset to event 49; the mission must complete correctly from the fork, the abandoned suffix must remain queryable, and no abandoned-suffix side effect may be re-emitted.
- **DEPENDENCIES:** M-1, M-10.
- **PING_REPRODUCIBLE?** Partial. Fork-from-prefix is reproducible on an event journal. The subtlety is reapply semantics for inbound messages and the non-undoing of external effects — needs explicit operator UX.

---

### M-17 · Local activities (reduced-durability fast path)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Durability overhead for trivial steps: not every 200ms API call deserves a full server round-trip, task-queue dispatch, and history events.

- **PROBLEM:** Making every tiny step a full activity doubles latency and history size; but inlining it in workflow code breaks determinism/replay.
- **FAILURE_CLASS_SOLVED:** latency/history bloat for short, low-risk steps.
- **SOURCE:** docs.temporal.io/activities; sdk-go `internal/internal_event_handlers.go`.
- **PINNED_SHA:** sdk-go `626130f1fd9de50cfd90b884a3fb796504f22dc1`.
- **SOURCE_LOCATION:** `internal/internal_event_handlers.go:873` `ExecuteLocalActivity`, `:1746` `localActivityMarkerName`, `:1880` — local activities execute in the *workflow worker process* and are recorded as Marker events (retries invisible in history). Docs: "When specific performance optimizations are more important than full durability, an Activity may be executed in the same process as a Workflow, bypassing the regular Activity Execution and Task Queue. Local Activities are not a replacement for regular Activities."
- **MATURITY:** Production, with documented limits.
- **INVARIANT:** *Durability is a dial, not a binary — but the dial's setting is explicit per call, and the reduced mode is still recorded (as markers), never invisible.*
- **IMPLEMENTATION:** Same activity definition/registration; invoked via `ExecuteLocalActivity`; runs on the workflow worker with local retry; result recorded as a marker event so replay stays deterministic.
- **FAILURE_MODE:** No heartbeating, no task-queue routing, limited retry visibility; a workflow-worker crash loses in-flight local activities (they re-run on replay — hence must be idempotent and short). Overuse recreates the problems M-1 solves.
- **PING_EXISTING_ANALOG:** PING's in-worker tool calls vs durable mission steps — the distinction exists informally.
- **GAP:** The durability dial is not explicit per step; there's no recorded marker for "this was a local, reduced-durability step."
- **HARVEST_CLASS:** STUDY.
- **FALSIFICATION:** Mark a step local; kill the workflow worker mid-step; the step must re-execute on replay with no history gap and no duplicate external effect (idempotency), and the journal must show it was a local step.
- **DEPENDENCIES:** M-1.
- **PING_REPRODUCIBLE?** Yes. A `durability: full|local` flag on the step + marker events in the journal.

---

### M-18 · Terminate vs cancel; id-conflict policy (the sharp tools, labeled)

**WHAT FAILURE CLASS DOES THIS SOLVE?** Operator error during incidents: reaching for "stop" and getting the wrong kind of stop — graceful when you needed immediate, or immediate (data loss, no cleanup) when you needed graceful.

- **PROBLEM:** Every system has a stop button; few label what the button does to in-flight work, cleanup, and children.
- **FAILURE_CLASS_SOLVED:** wrong-stop incidents; ambiguous restart-after-stop.
- **SOURCE:** Temporal docs/CLI/community.
- **PINNED_SHA:** n/a.
- **SOURCE_LOCATION:** `temporal workflow cancel` — "Graceful cancel — workflow receives CancellationError and can clean up" vs `temporal workflow terminate` — "immediate stop, no cleanup" (both take `--reason`). `--id-conflict-policy`: `Fail` / `UseExisting` / `TerminateExisting` — what a start does when an open execution already holds the ID.
- **MATURITY:** Production.
- **INVARIANT:** *Every destructive operator action names its semantics (graceful vs immediate) and records a reason.* Starting over an open execution is an explicit policy choice, never an accident.
- **IMPLEMENTATION:** Cancel/terminate are distinct server APIs producing distinct close statuses (`Cancelled` vs `Terminated`), which feed the ID-reuse policy (M-4: `AllowDuplicateFailedOnly` treats them differently from `Completed`).
- **FAILURE_MODE:** Terminate is the footgun — immediate, no compensation; the reason string is the only audit. `TerminateExisting` as a default would be dangerous; it's opt-in per start.
- **PING_EXISTING_ANALOG:** Standing law: consequential gates, kill-test discipline. Close statuses exist on missions (completed/failed).
- **GAP:** No cancel-vs-terminate distinction in mission lifecycle; no recorded reason on kills; no conflict policy on mission start.
- **HARVEST_CLASS:** ADOPT (cheap, high operator-safety value).
- **FALSIFICATION:** Terminate a mission and cancel another; the journal must show distinct close statuses with reasons, and a subsequent start with `AllowDuplicateFailedOnly` must behave differently for each.
- **DEPENDENCIES:** M-4, M-9.
- **PING_REPRODUCIBLE?** Yes. Status enum + reason column + start-path policy. Trivial machinery; the value is the discipline.

---

## 3. Where Temporal semantics do NOT transfer to LLM-agent autonomy

Honest boundary. Temporal's entire edifice rests on one load-bearing assumption: **orchestration logic is deterministic code** — same history in, same commands out. LLM agents violate this assumption structurally, not incidentally. Each point below is a place where naive transplantation fails.

### 3.1 The determinism contract vs. the planner

Temporal detects nondeterminism by comparing replayed commands to history (M-2). An LLM planner re-planning a step from the same history will *legitimately* produce different tool-call sequences — different orderings, different phrasings, different decompositions — that are all "correct." A literal M-2 tripwire would halt every resumed agent mission on false positives.

Temporal's own answer (visible in the sdk-python `deepagents`/`openai_agents`/`strands` contribs) is: **don't put the planning in the deterministic part.** The agentic loop runs inside the workflow, but every model call and every tool call is an *activity*; replay reuses recorded outputs and never re-invokes the model. The model's "decisions" become recorded history, not recomputed logic.

The honest cost: **replay can never incorporate new information.** If the world changed while the worker was dead, a replayed agent re-enacts stale decisions — it cannot re-plan against the new world because re-planning would diverge from history. Temporal trades adaptability-after-failure for exact-resumption. For PING's multi-day missions (where the world *does* change during outages), this tradeoff must be explicit: resume-exactly vs re-plan-with-awareness are different recovery modes, and Temporal only offers the first.

**Harvest:** the *shape* (record every model/tool hop as a journal event; never re-invoke on resume) transfers. The *mismatch tripwire* does not transfer literally to planner output — it transfers only to the *typed envelope* (step list, tool names, argument schemas), never to token-level content.

### 3.2 Sandbox enforcement vs. tool-using agents

M-3's sandbox blocks `socket`, `datetime.now()`, `random` in workflow code. But an LLM agent's whole job is to reach the outside world through tools. The sandbox can constrain *code the agent writes*; it cannot constrain *text the agent generates* that a tool then acts on. Prompt injection, tool-abuse, and exfiltration-via-legitimate-tool are outside the sandbox's threat model entirely.

Worse: the natural "fix" — routing every tool call through an activity (which Temporal's agent contribs do) — moves the security boundary to the activity worker, where the activity is *allowed* to do anything. The sandbox then guarantees determinism of the loop while saying nothing about the safety of the effects. **Determinism and safety are orthogonal; Temporal sells the first and is silent on the second.**

**Harvest:** sandbox the deterministic *scaffolding* (planners' helper code, state reducers). Do not mistake it for a safety boundary for agent effects — that remains PING's capability plane (default-deny grants), which is the stronger and more relevant mechanism.

### 3.3 Recorded LLM outputs are not the same as deterministic commands

In Temporal, an activity's recorded result is *the truth* — replay reuses it because recomputing would give the same answer. An LLM activity's recorded output is *a* truth — recomputing could give a different, equally valid answer, and the mission's downstream logic may have (implicitly) depended on the specific phrasing, ordering, or even the model's arbitrary choices (e.g. which of three plausible plans it picked).

This means: **M-1 replay of agent missions replays accidents as faithfully as intentions.** A resumed mission continues down a path chosen by sampling noise, with no way to distinguish "the model decided X for good reasons" from "the model sampled X." Temporal's machinery cannot see this distinction; it treats both as history.

**Harvest:** record *why* alongside *what* — decision rationale, alternatives considered, confidence — as journal metadata. Replay fidelity without decision provenance is a trap: it makes the mission reproducible but not *understandable* or *auditable*. (This aligns with PING's evidence-bounded principles.)

### 3.4 Versioning assumes code; agents are prompts

M-14's patch markers version *code branches*. PING's mission logic is substantially *prompts* — and prompts change constantly, informally, without any marker discipline. A prompt edit mid-mission is exactly the "deploy new code over in-flight runs" hazard, but there is no `patched("prompt-v2")` equivalent and no `TemporalChangeVersion` search attribute for prompt text.

**Harvest:** version prompts as data (hash the prompt text into the journal at mission start; branch selection by recorded hash). This is straightforward to build and closes a real, currently-open hazard. But note the limit: semantic drift between prompt versions is not checkable by any mismatch detector — only behavioral testing catches it.

### 3.5 Exactly-once is still the developer's job

Temporal is at-least-once delivery + deterministic replay + *idempotent activities* (docs: "We recommend that it be idempotent, so retries can be processed without duplicate side effects"). The platform does not make your email-send idempotent; you do, with idempotency keys. For agent side effects (PRs merged, messages sent, infra changed), the failure class "retry after partial effect" is unchanged by any of this machinery. Engineers who believe "Temporal gives me exactly-once" will double-send.

**Harvest:** the discipline (idempotency keys on every external effect; M-13 SideEffect for key generation), not the illusion.

### 3.6 What Temporal never tried to solve (and PING still must)

- **Goal drift / mission correctness:** Temporal guarantees the mission *executes as written*, not that it was worth writing. A perfectly replayed wrong mission is still wrong. PING's verdict authority / outcome evaluation has no Temporal analog.
- **Capability authorization:** who may do what, with whose credentials, under what grant — Temporal has namespaces and mTLS; fine-grained "this run may read Gmail but not send" is PING's capability plane, not Temporal's.
- **Multi-stakeholder approval (HITL):** Temporal's updates give validated mutations, but "three humans must approve this step" is workflow logic you write yourself. (The sdk-python ADK contrib mentions "durable HITL" — worth watching, but it's scaffolding, not policy.)
- **Cost control:** unlimited-retries-by-default (M-5's sharpest edge) applied to LLM activities means unbounded token spend. Temporal has no spend circuit breaker; PING needs one before adopting Temporal-shaped retries for model calls.
- **Supervision and anomaly detection:** Temporal tells you a workflow is stuck (timeouts, alerts on sticky evictions); it does not tell you a mission is *going wrong but making progress*. That's an evaluation problem, not a durability problem.

---

## 4. Open questions

1. **Replay-vs-replan as a first-class recovery mode.** Can PING define two distinct resume semantics — exact-replay (Temporal mode) and re-plan-from-checkpoint (agent mode) — with the mode recorded in the journal and chosen by policy per mission? What are the safety invariants of re-plan mode?
2. **Typed-envelope determinism.** What is the minimal typed envelope of an agent step (tool name, argument schema, ordering constraints) over which an M-2-style tripwire can operate without false-positive halting on legitimate LLM variance? Can this be prototyped against recorded mission journals?
3. **Heartbeat protocol shape.** M-6 is the highest-value harvest. Open: heartbeat interval policy per step type, progress-blob schema conventions, and who owns the staleness sweeper (mission runtime vs separate watchdog).
4. **Continue-as-new state boundary.** What exactly is PING's "state" that must be carried across a rollover — and what is provably safe to drop? The deepagents guard ("only CAN when no turn is mid-flight and queues are drained") suggests the boundary rule: *rollover only at quiescent points*. How does PING define quiescence for its missions?
5. **Prompt versioning UX.** If prompts are versioned as data with history-selected branching (3.4), how do operators see "which prompt version is this run on" and how do they migrate in-flight runs deliberately?
6. **Cost-bounded retries for LLM activities.** What does a retry policy look like when each attempt costs tokens — is it attempts, spend, or both? Temporal's schema has no spend dimension; PING's needs one.
7. **Reset UX and the non-undoing of effects.** M-16's sharpest edge (abandoned suffix effects are not undone) needs operator UX that makes this unmistakable. What does a safe reset flow look like for missions with real-world side effects?
8. **Do we need the server at all?** Every mechanism above was assessed as reproducible on PG + a mission runtime, without a Temporal cluster. The open strategic question (for the parent orchestrator, not this lane): at what scale/complexity does the build-vs-adopt curve cross? This lane's finding: not yet — the invariants are harvestable, the binary is not needed.

---

## Appendix: mechanism index

| ID | Mechanism | Harvest class |
|----|-----------|---------------|
| M-1 | Deterministic event-sourced replay | ADAPT |
| M-2 | Replay command/history mismatch detection (TMPRL1100) | ADAPT |
| M-3 | Sandbox determinism enforcement | STUDY |
| M-4 | Workflow ID + Run ID + reuse/conflict policy | ADOPT |
| M-5 | Declarative retry policies | ADOPT |
| M-6 | Heartbeating + heartbeat details | ADOPT |
| M-7 | Four-timeout taxonomy | ADAPT |
| M-8 | Durable timers | ADAPT |
| M-9 | Cancellation model (cancel vs terminate, scopes, disconnected context) | ADAPT |
| M-10 | Continue-as-new | ADAPT |
| M-11 | Signals / queries / updates | ADAPT |
| M-12 | Child workflows + parent close policy | ADAPT |
| M-13 | SideEffect / MutableSideEffect | STUDY |
| M-14 | Versioning (patch markers, deprecate lifecycle, build IDs) | STUDY |
| M-15 | Sticky execution (cache-never-truth) | ADAPT |
| M-16 | Workflow reset | STUDY |
| M-17 | Local activities | STUDY |
| M-18 | Terminate-vs-cancel labeling; id-conflict policy | ADOPT |

*No Temporal adoption is proposed. All findings are semantics for PING to adapt or reject on its own substrate.*
