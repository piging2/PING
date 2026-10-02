# LANE 6: Mature Orchestration Lessons (Dagster / Prefect / Airflow / Hatchet)

**Mode:** RESEARCH / FALSIFICATION / HARVEST ONLY. No feature-matrix comparison.
**Date:** 2026-09-23. **Method:** docs + source at pinned SHAs. Convergence (independent rediscovery) is the signal.

## 1. Sources

| System | Repo | Pinned SHA (HEAD at read time) | Docs |
|---|---|---|---|
| Dagster | dagster-io/dagster | `32a16e47242086918c06baf09124ec5696271a24` | docs.dagster.io |
| Prefect | PrefectHQ/prefect | `148e99781fb05df258d3efddb5ef4fee0b61c9f2` | docs.prefect.io |
| Airflow | apache/airflow | `eebf253b72cc870f8725c10a6fcdd5f8058f2b9a` | airflow.apache.org/docs/apache-airflow/stable |
| Hatchet | hatchet-dev/hatchet | `073f45fe0bc5177ad44e25e184c3243899f9b6dc` | docs.hatchet.run |

**Files read (all at pinned SHAs):**
- Dagster: `python_modules/dagster/dagster/_core/storage/dagster_run.py` (run status enum), `_daemon/daemon.py` (daemon loop base), `_daemon/run_coordinator/queued_run_coordinator_daemon.py` (queue/dequeue), `_daemon/monitoring/run_monitoring.py` (watchdogs), `_daemon/backfill.py` + `_core/execution/backfill.py` (backfill), `_core/execution/retries.py` (step retry).
- Prefect: `src/prefect/server/schemas/states.py` (state machine), `src/prefect/server/orchestration/rules.py` (orchestration engine), `core_policy.py` (retry rules, concurrency leases), `global_policy.py`, `src/prefect/server/concurrency/lease_storage/{filesystem,memory}.py`, `src/prefect/server/services/{foreman,scheduler,cancellation_cleanup,repossessor}.py`.
- Airflow: `airflow-core/src/airflow/utils/state.py` (state enums), `models/taskinstance.py` (retry backoff), `models/dagrun.py` (`update_state`), `models/backfill.py`, `jobs/scheduler_job_runner.py` (loop, critical section, zombie purge, orphan adoption).
- Hatchet: `pkg/scheduling/v1/{lease_manager,scheduler,queuer}.go`, `pkg/repository/{scheduler_lease,partition_lease,scheduler_queue,dispatcher,idempotency}.go`, `pkg/repository/sqlcv1/lease.sql`, `pkg/worker/{worker,workflow}.go`, `api-contracts/workflows/workflows.proto`.

## 2. Mechanisms (canonical format)

---

### M-01 EXPLICIT-RUN-STATE-MACHINE
- **PROBLEM:** Every participant must agree on what "a run is now" without reading each other's minds; ambiguous states cause double-execution and lost work.
- **SOURCE:** All four repos.
- **PINNED_SHA:** (all four, see Sources)
- **SOURCE_LOCATION:** Airflow `utils/state.py` (`TaskInstanceState`, `TerminalTIState`, `IntermediateTIState`, `DagRunState`); Dagster `_core/storage/dagster_run.py` (`DagsterRunStatus`, `FINISHED_STATUSES`, `IN_PROGRESS_RUN_STATUSES`); Prefect `server/schemas/states.py` (`StateType`, `TERMINAL_STATES`); Hatchet v1 run statuses QUEUED/RUNNING/COMPLETED/FAILED/CANCELLED (engine + CLI contract).
- **MATURITY:** Battle-tested. All four converged on: a small (<15) enumerated state set; an explicitly named TERMINAL subset; states split into "scheduler-owned" vs "worker-owned" writers (Airflow comments literally mark `# Set by the scheduler` vs `# Set by the task instance itself`).
- **INVARIANT:** Terminal states are never exited. Exactly one component owns each transition direction (e.g., only the scheduler moves SCHEDULED→QUEUED in Airflow; only the run monitor moves STARTING→FAILURE on timeout in Dagster).
- **IMPLEMENTATION:** String enums in the DB; `TERMINAL_STATES` sets checked at write time; writer-ownership documented per state.
- **FAILURE_MODE:** State proliferation (each new "waiting" flavor doubles the transition matrix); writers violating ownership cause split-brain (Airflow defends with row locks, see M-09).
- **PING_EXISTING_ANALOG:** UNKNOWN — not audited in this lane. PING has an event/evidence plane; whether missions carry an explicit enumerated lifecycle with declared terminal states needs verification.
- **GAP:** PING needs an explicit mission/run state enum with a declared terminal subset and per-state writer ownership before any other mechanism here can be built on top.
- **HARVEST_CLASS:** ADOPT-DIRECTLY (foundational; zero design risk).
- **FALSIFICATION:** Airflow `state.py` literally separates `TerminalTIState` from `IntermediateTIState`; Dagster maintains three covering lists (`IN_PROGRESS`, `NON_IN_PROGRESS`, `FINISHED`) with the comment "This and the enum above should cover all run statuses" — exhaustiveness is enforced by construction.
- **DEPENDENCIES:** None (base layer).
- **CONVERGENCE_COUNT:** 4/4.

---

### M-02 ILLEGAL-TRANSITION-GUARDS
- **PROBLEM:** A worker reporting SUCCESS for a run the scheduler already marked FAILED corrupts the ledger; transitions must be validated against (from, to), not just "to".
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Prefect `orchestration/rules.py` + `core_policy.py` (per-rule `FROM_STATES`/`TO_STATES`; e.g. `RetryFailedFlows.FROM_STATES={RUNNING}, TO_STATES={FAILED}`; `EnforceCancellingToCancelledTransition`); Airflow `scheduler_job_runner.py` `_find_task_instances_without_heartbeats` revalidates each row's state before purge ("defense in depth"); Dagster `run_monitoring.py` `check.invariant(run.status in {STARTING, NOT_STARTED})`; Hatchet `lease.sql` conditional update `WHERE "Lease"."expiresAt" < now() OR "Lease"."id" = ANY(...)`.
- **MATURITY:** Battle-tested. Prefect's design is the most explicit: no single transition table; instead every orchestration rule declares the (from,to) pairs it governs, and the engine nests rules as context managers around the transition (`BaseOrchestrationRule`: "Complex orchestration is achieved by nesting multiple rules... These hooks will fire as long as the state transition is considered 'valid'").
- **INVARIANT:** A transition is committed only if (current_state, proposed_state) is accepted by the governing policy; rejected transitions substitute a legal state (Prefect `reject_transition(state=...)`) rather than silently dropping the intent.
- **IMPLEMENTATION:** Prefect: orchestration context + rule pipeline with abort/reject/wait semantics; Airflow: scheduler-mediated transitions + `adoptable_states` allowlist; Dagster: `check.invariant` assertions at watchdog entry; Hatchet: SQL `WHERE` clauses on conditional writes.
- **FAILURE_MODE:** Distributed guards drift (Prefect's rules are powerful but the "real" transition table exists only as the emergent union of rules — hard to audit); overly strict guards deadlock cancellation (Prefect needed `BypassCancellingFlowRunsWithNoInfra` as an escape hatch).
- **PING_EXISTING_ANALOG:** UNKNOWN. PING's "fail closed" posture (memory) suggests guards exist somewhere; whether mission-lifecycle transitions are guarded by (from,to) policy is unverified.
- **GAP:** PING should adopt guarded transitions, but keep the guard table auditable (single source of truth), learning from Prefect's emergent-complexity failure mode.
- **HARVEST_CLASS:** ADAPT (take the invariant + reject-with-substitute pattern; avoid the distributed-rule audit problem).
- **FALSIFICATION:** Prefect `EnforceCancellingToCancelledTransition` and `BypassCancellingFlowRunsWithNoInfra` prove the guard set is load-bearing and also that strictness required explicit bypasses — both directions are real.
- **DEPENDENCIES:** M-01.
- **CONVERGENCE_COUNT:** 4/4 (mechanisms differ: rule pipeline / scheduler mediation / invariants / conditional SQL).

---

### M-03 HEARTBEAT-BASED-LIVENESS
- **PROBLEM:** You cannot distinguish "worker is slow" from "worker is dead" without a freshness signal.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow `scheduler_job_runner.py` (`perform_heartbeat` on scheduler `Job` rows; TI `last_heartbeat_at`; `task_instance_heartbeat_timeout`); Prefect `services/foreman.py` (`monitor_worker_health`: "Marks workers as offline if they have an old last_heartbeat_time"); Hatchet `repository/scheduler_lease.go` + `lease.sql` (`ListActiveWorkers ... WHERE w."lastHeartbeatAt" > NOW() - INTERVAL '5 seconds'`); Dagster `_daemon/daemon.py` (`_check_add_heartbeat`).
- **MATURITY:** Battle-tested. Heartbeat cadence is tuned per role: Hatchet workers 5s freshness window; Airflow scheduler jobs heartbeat to the `Job` table; Dagster daemons heartbeat.
- **INVARIANT:** Liveness = "fresh heartbeat row within N× the heartbeat interval". Staleness is a *suspicion*, never proof — every system pairs detection with a separate reaping/adoption step (M-04), never deletes on suspicion alone.
- **IMPLEMENTATION:** Timestamp column updated on a loop; readers compare against `now() - interval`.
- **FAILURE_MODE:** Clock skew across hosts; heartbeat storms under load (every worker writing every 5s); false suspicion during GC pauses / network blips (PING's own "commute blackout" misattribution is exactly this failure mode).
- **PING_EXISTING_ANALOG:** UNKNOWN for mission workers. (Memory notes host sleep destroyed browser targets mid-run — a liveness concern that exists operationally but may not be modeled.)
- **GAP:** PING needs a liveness signal for long-running agent workers that tolerates multi-minute gaps (LLM calls, host sleep) — 5s cadences do NOT transfer; the *suspicion-vs-proof* separation DOES.
- **HARVEST_CLASS:** ADAPT (keep the invariant; rescale the timing by 10-100×; pair with progress-evidence, not just timestamps).
- **FALSIFICATION:** Hatchet's 5s window and Airflow's configurable `task_instance_heartbeat_timeout` show the interval is a tuning parameter, while the *pattern* (freshness → suspicion → separate reaping) is constant.
- **DEPENDENCIES:** M-01.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-04 ZOMBIE-REAP-AND-ORPHAN-ADOPTION
- **PROBLEM:** When a worker/scheduler dies mid-run, its in-flight work must be failed or re-owned by a survivor — exactly once, with an audit trail.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow `adopt_or_reset_orphaned_tasks` ("Adopt or reset any TaskInstance in resettable state if its SchedulerJob is no longer running"; dead SchedulerJobs marked FAILED via heartbeat timeout; rows locked `FOR UPDATE ... SKIP LOCKED` "so that another scheduler can't try and adopt these too"; abandoned attempt preserved: "Record the current try to TaskInstanceHistory first so users have an audit trail for the attempt that was abandoned"); Airflow `_find_and_purge_task_instances_without_heartbeats` ("Lock the rows ... so a worker can't commit a terminal state on the same TI between this scan and the handle_failure() in the purge that follows in the same transaction. skip_locked keeps HA schedulers from blocking on each other"); Dagster `monitor_started_run` (unhealthy worker → `resume_run` with bounded `run_monitoring_max_resume_run_attempts`, then fail); Hatchet lease expiry-steal (`ON CONFLICT ... DO UPDATE ... WHERE "Lease"."expiresAt" < now()`); Prefect `foreman` (mark offline) + `repossessor` (revoke expired leases, decrement slots).
- **MATURITY:** Battle-tested. This is the mechanism with the most defensive depth in all four codebases: row locks, revalidation, audit trails, bounded resume attempts.
- **INVARIANT:** Reaping is a transaction: (1) claim ownership under lock, (2) revalidate state, (3) record the abandoned attempt, (4) reset/requeue. Never skip (3).
- **IMPLEMENTATION:** Heartbeat-timeout detection → ownership claim (lock or lease steal) → state revalidation → audit record → reset to schedulable or adopt.
- **FAILURE_MODE:** Split-brain adoption (two schedulers both adopt) — all four defend with DB locks or lease uniqueness; resume storms (Dagster bounds resume attempts); resurrecting work the user cancelled (Airflow checks `DagRun.state == RUNNING` before adopting).
- **PING_EXISTING_ANALOG:** UNKNOWN. PING's resume/retry machinery (typed gap states, brief-rotation retries per AGENTS.md) is retry-oriented; whether dead-agent work is *adopted by a survivor with an audit trail* is unverified.
- **GAP:** For multi-day missions, PING needs exactly this: dead-worker detection → lease/ownership transfer → abandoned-attempt ledger entry → resume from checkpoint. The audit-trail-before-reset step is the most harvestable detail.
- **HARVEST_CLASS:** ADOPT-DIRECTLY (the 4-step transaction shape; the audit-before-reset detail).
- **FALSIFICATION:** Airflow's comment "skip_locked keeps HA schedulers from blocking on each other" + "_purge_... still revalidates each row's state before acting, as defense in depth" shows two independent layers (locking + revalidation) — convergence within a single system, not just across systems.
- **DEPENDENCIES:** M-01, M-02, M-03, M-13.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-05 TIME-BOUNDED-LEASE-WITH-EXPIRY-STEAL
- **PROBLEM:** Mutual exclusion across processes without a single coordinator; the holder may die, so the lock must self-release.
- **SOURCE:** Hatchet, Prefect (explicit); Airflow (DB-lock equivalent).
- **PINNED_SHA:** (see Sources)
- **SOURCE_LOCATION:** Hatchet `pkg/repository/sqlcv1/lease.sql`: `INSERT INTO "Lease" ... ON CONFLICT ("tenantId","kind","resourceId") DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt" WHERE "Lease"."expiresAt" < now() OR "Lease"."id" = ANY(@existingLeaseIds)` — i.e., steal-if-expired, extend-if-holder; default 30s TTL, extended every 5s by `LeaseManager.loopForLeases`; kinds: WORKER/QUEUE/CONCURRENCY/BATCH/TABLE_PARTITION_MAINTENANCE (15-min partition lease). Prefect `server/concurrency/lease_storage/`: lease with TTL + expiration index, `renew_lease`; `SecureFlowConcurrencySlots`: "A lease is created for the concurrency limit. The client will be responsible for maintaining the lease." with grace-period fallback; `Repossessor`: "Handles reconciliation of expired concurrency leases" (revoke + `bulk_decrement_active_slots`). Airflow equivalent: `_critical_section_enqueue_task_instances` takes the Pool-model row lock with NOWAIT; on `is_lock_not_available_error` → "Critical section lock held by another Scheduler", metric + rollback (fail-fast, not wait).
- **MATURITY:** Battle-tested. Hatchet uses one Lease table for scheduler sharding (each queue/worker/concurrency-strategy owned by exactly one scheduler) and partition maintenance; Prefect uses leases for capacity slots with client-side renewal.
- **INVARIANT:** Uniqueness on (scope, kind, resource); holder must renew faster than TTL; anyone may take an expired lease; release is explicit but expiry is the backstop. The lease protects *liveness of the exclusion*, not just mutual exclusion.
- **IMPLEMENTATION:** Unique-constraint + conditional upsert (Hatchet); file/DB-backed lease store with expiration index and repair (Prefect filesystem.py even has `_repair_expiration_index` for torn writes); NOWAIT row locks (Airflow).
- **FAILURE_MODE:** TTL too short → flapping ownership; TTL too long → slow failover; renewal loop death while work continues (Prefect handles in-process retry lease carry-forward explicitly); Prefect's filesystem lease store needs index repair logic — complexity cost of not using the DB.
- **PING_EXISTING_ANALOG:** UNKNOWN. (Agent write authority exists per memory, but lease-scoped exclusive ownership of mission artifacts is unverified.)
- **GAP:** PING's multi-agent missions need exactly this for: artifact mutation ownership, tool-level mutual exclusion, and survivor-takeover. TTL sizing is the open question (minutes, not seconds).
- **HARVEST_CLASS:** ADOPT-DIRECTLY (the steal-if-expired + extend-if-holder SQL shape is copy-ready).
- **FALSIFICATION:** Hatchet's single `Lease` table serves both scheduler-sharding and partition-maintenance with different TTLs per kind — the abstraction survived two unrelated uses, which is strong evidence of generality. Prefect's `RemoveDeploymentConcurrencyLeaseForOldClientVersions` shows the lease protocol had to be versioned — evidence it is load-bearing.
- **DEPENDENCIES:** M-03 (renewal needs a live holder signal).
- **CONVERGENCE_COUNT:** 2/4 explicit (Hatchet, Prefect); 3/4 with Airflow's NOWAIT row-lock equivalent. Dagster relies on single-daemon deployment + heartbeats instead.

---

### M-06 PRIORITY-QUEUE-WITH-FIFO-WITHIN-PRIORITY
- **PROBLEM:** Limited capacity; urgent work must jump the queue without starving or reordering everything else.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Dagster `queued_run_coordinator_daemon.py` `_priority_sort`: "sorted is stable, so fifo is maintained" on the `dagster/priority` tag; Hatchet `queuer.go` `refillQueue`: `sort.Slice` by `Priority` desc, `ID` asc (ID-asc = insertion order = FIFO); Airflow `priority_weight` on tasks + Pool slots; Prefect work queues with priority + concurrency limits.
- **MATURITY:** Battle-tested. All four independently chose the same ordering: priority descending, then insertion order — never priority-only (which starves) and never pure FIFO (which can't expedite).
- **INVARIANT:** Ordering key = (priority DESC, sequence ASC). Priority is a tag on the work item, not a separate queue, so reprioritization doesn't require moving items.
- **IMPLEMENTATION:** Sort comparator at dequeue/refill time (Dagster, Hatchet); weight column consumed by the scheduler (Airflow).
- **FAILURE_MODE:** Priority inflation (everything becomes P0); FIFO tiebreak breaks under clock skew if sequence isn't monotonic (Hatchet uses monotonic ID, not timestamp — the right call).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** Straightforward to adopt for PING's mission queue; use a monotonic sequence (not wall-clock) for the FIFO tiebreak.
- **HARVEST_CLASS:** ADOPT-DIRECTLY.
- **FALSIFICATION:** Dagster's comment "sorted is stable, so fifo is maintained" and Hatchet's `ID <` tiebreak are two independent implementations of the identical invariant.
- **DEPENDENCIES:** M-01.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-07 SERVER-SIDED-RETRY-WITH-DELAY
- **PROBLEM:** Transient failures should be retried automatically, but the *decision* (retry vs fail) must not depend on the dying worker's judgment.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Prefect `core_policy.py` `RetryFailedFlows`/`RetryFailedTasks`: "Rejects failed states and schedules a retry if the retry limit has not been reached... The client will be instructed to transition into a scheduled state" — the server *rejects* the FAILED transition and substitutes `AwaitingRetry(scheduled_time=now()+retry_delay)`, carrying the concurrency lease forward across the retry. Airflow `taskinstance.py` `next_retry_datetime`: exponential backoff with **deterministic** jitter — `sha1(f"{dag_id}#{task_id}#{logical_date}#{try_number}")` modded into `[min_backoff, 2*min_backoff)`, capped by `MAX_RETRY_DELAY`, with OverflowError guards. Dagster `execution/retries.py` (`RetryMode` incl. DEFERRED for orchestrator engines) + backfill `with_failure_count`. Hatchet `worker/workflow.go`: `Retries`, `RetryBackoffFactor`, `RetryMaxBackoffSeconds`, plus `ScheduleTimeout` on queue items.
- **MATURITY:** Battle-tested. Two independent discoveries of jittered backoff (Airflow deterministic-hash, Hatchet random) to avoid thundering herds.
- **INVARIANT:** Retry budget is counted server-side (`run_count` vs `retries`, `try_number` vs `max_tries`); the wait is a *scheduled state*, not a sleep — the worker goes away and the scheduler wakes the work. Backoff is jittered and capped.
- **IMPLEMENTATION:** Reject-and-reschedule (Prefect), `UP_FOR_RETRY` + `next_retry_datetime` (Airflow), retry-state machine (Hatchet).
- **FAILURE_MODE:** Retrying non-transient failures burns budget (all four rely on the *author* to set sensible retry counts — none classify transient vs permanent server-side); Airflow's comment notes `try_number` "can increase without bound" after clears — the jitter math had to be hardened against it.
- **PING_EXISTING_ANALOG:** BEST-EFFORT: AGENTS.md records "typed gap states, brief-rotation retries" in the PING/tandem pipeline — a retry mechanism exists, but whether retry decisions are server-sided (vs agent-decided) and whether waits are scheduled-states (vs sleeps) is unverified.
- **GAP:** PING should move retry *decisions* server-side with counted budgets and scheduled-state waits; adopt deterministic jitter (Airflow's hash approach removes RNG state).
- **HARVEST_CLASS:** ADAPT (the locus shift — server decides — is the lesson; backoff math is copy-ready).
- **FALSIFICATION:** Prefect's rule *rejects* the worker-proposed FAILED state — the strongest possible evidence that the retry decision was deliberately taken away from the worker.
- **DEPENDENCIES:** M-01, M-02.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-08 BOUNDED-SCHEDULER-LOOP
- **PROBLEM:** A scheduler tick must never do unbounded work; one huge DAG must not starve the loop.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow `_do_scheduling` docstring: "we select only 10 dags by default... putting this higher will mean one scheduler could spend a chunk of time creating dag runs, and not ever get around to scheduling tasks"; "Finds the 'next n oldest' running DAG Runs (n=20 by default)"; `with prohibit_commit(session)` guard. Dagster: `page_size` pagination ("The maximum number of runs we'll hold in memory is max_runs_to_launch + page_size"), `IntervalDaemon`. Prefect scheduler service: `deployment_batch_size`, `min_runs`/`max_runs` per schedule ("fewer than min_runs auto-scheduled runs... or max scheduled time"). Hatchet `refillQueue`: `limit := 2 * q.limit`, replenish-at-most-1/sec; `queuePollInterval` with backoff.
- **MATURITY:** Battle-tested. Every system bounds *each phase* of the tick separately (create vs examine vs enqueue).
- **INVARIANT:** Each loop iteration does O(budget) work; progress across iterations is by cursor (oldest-first / pagination), not by scanning everything.
- **IMPLEMENTATION:** Config knobs per phase + DB pagination + "next oldest" selection.
- **FAILURE_MODE:** Budgets set too low → scheduling latency; too high → loop overruns and heartbeat timeouts (Airflow's docstring explicitly warns about this tradeoff).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** PING's engine sweeps (outreach/discovery/engagement passes already use per-pass caps per AGENTS.md) follow this; mission-scheduler loops should adopt the same per-phase budgets + cursor pattern.
- **HARVEST_CLASS:** ADOPT-DIRECTLY.
- **FALSIFICATION:** Airflow documents the failure mode in the docstring itself ("not ever get around to scheduling tasks") — the bound exists because the unbounded version was observed to fail.
- **DEPENDENCIES:** None.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-09 SINGLE-WRITER-CRITICAL-SECTION-FOR-ALLOCATION
- **PROBLEM:** Deciding "which work gets scarce capacity" must be atomic; two schedulers must not both hand the last slot to different work.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow `_critical_section_enqueue_task_instances`: locks the Pool-model rows; on `is_lock_not_available_error`: "Critical section lock held by another Scheduler", `stats.incr("scheduler.critical_section_busy")`, rollback and return 0 — fail-fast, never wait. Dagster `_dequeue_run`: "double check that the run is still queued before dequeing" + re-fetch after launch; single daemon thread does dequeues. Hatchet: queue leases (M-05) — only the lease holder runs a queue's assignment loop. Prefect: orchestration rules run inside the DB transaction that validates the state (`validate_proposed_state` flushes within the session).
- **MATURITY:** Battle-tested. The shared discovery: the critical section should be *small* (Airflow: only the enqueue phase, not the whole tick) and *fail-fast* (NOWAIT + busy metric, not blocking).
- **INVARIANT:** Capacity allocation is atomic per decision; losers back off observably (busy metric), they don't queue behind the lock.
- **IMPLEMENTATION:** NOWAIT row locks / lease ownership / revalidation-at-commit.
- **FAILURE_MODE:** Critical section too broad → throughput collapse; too narrow → double-allocation (Airflow's pool oversubscription bugs historically).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** Any PING capacity decision (which mission gets the next agent worker, which tool gets exclusive use) needs a fail-fast critical section, not a blocking lock.
- **HARVEST_CLASS:** ADOPT-DIRECTLY (fail-fast + busy-metric pattern).
- **FALSIFICATION:** Airflow emits `scheduler.critical_section_busy` and separately times `scheduler.critical_section_duration` — contention is a first-class metric, proving the section is a known hotspot managed by measurement.
- **DEPENDENCIES:** M-05, M-08.
- **CONVERGENCE_COUNT:** 4/4 (different machinery, same shape).

---

### M-10 APPEND-ONLY-STATE-LEDGER
- **PROBLEM:** Current-state columns lose history; debugging "how did it get into this state" requires the transition trail.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow `TaskInstanceHistory` ("Record the current try to TaskInstanceHistory first so users have an audit trail for the attempt that was abandoned"); Prefect: states are rows in `flow_run_state`/`task_run_state`, appended via `run.set_state` + `session.flush()` — history is the table; Dagster: event log storage, per-run append-only logs with cursors (`get_logs_for_run`, `RESUME_RUN_LOG_MESSAGE` counted from the log); Hatchet: per-run event log (`eventType` QUEUED/STARTED/FINISHED/FAILED/CANCELLED) + log lines.
- **MATURITY:** Battle-tested. Notably, Airflow added TaskInstanceHistory *later* specifically because resets destroyed evidence — the ledger was a learned requirement, not an initial design.
- **INVARIANT:** State transitions are appended as events; the current state is a projection. Destructive reset (M-04) writes the abandoned attempt to the ledger *before* resetting.
- **IMPLEMENTATION:** Separate history table / event log storage with per-run cursors.
- **FAILURE_MODE:** Unbounded growth (all four need retention/vacuum: Prefect has `db_vacuum`; Airflow has retention config); dual-write skew between state column and ledger.
- **PING_EXISTING_ANALOG:** BEST-EFFORT: PING is described as "the event/evidence plane is the recorder" (memory) — an append-only event substrate likely exists; whether mission *state transitions* are all journaled there (vs only domain events) is unverified.
- **GAP:** Verify PING journals every mission state transition (not just business events); adopt the "ledger-write-before-reset" ordering from Airflow.
- **HARVEST_CLASS:** VERIFY-THEN-ADOPT (likely partially present).
- **FALSIFICATION:** Airflow's `prepare_db_for_next_try` ordering — history write *before* `ti.state = None` — is an explicit code-level enforcement of the invariant.
- **DEPENDENCIES:** M-01.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-11 PER-STATE-WATCHDOGS
- **PROBLEM:** Work can wedge in non-terminal states (started but never finishes; cancel requested but never completes); each stuck shape needs its own timeout.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Dagster `run_monitoring.py`: `monitor_starting_run` (STARTING→FAILURE on `run_monitoring_start_timeout_seconds`), `monitor_canceling_run` (CANCELING→CANCELED on cancel timeout, verified against the RUN_CANCELING event timestamp), `monitor_started_run` (worker health + `check_run_timeout` with per-run `dagster/max_runtime_seconds` tag override). Airflow: `task_instance_heartbeat_timeout` + `_find_and_purge_task_instances_without_heartbeats`; `scheduler_health_check_threshold`. Prefect: `cancellation_cleanup` (CANCELLING timeout → force CANCELLED), `pause_expirations`, `late_runs` (SCHEDULED past its time → late). Hatchet: `ScheduleTimeoutAt` on queue items ("if the current time is after the scheduleTimeoutAt, then mark this as timed out"), step `Timeout`.
- **MATURITY:** Battle-tested. The convergent shape is a *watchdog matrix*: one timeout per non-terminal state, each with its own remediation (fail / cancel / resume / requeue).
- **INVARIANT:** Every non-terminal state has a maximum dwell time and a defined remediation; the watchdog that fires must re-check current state before acting (Dagster: "Detected run status changed during monitoring loop... disregarding for now").
- **IMPLEMENTATION:** Periodic sweeps (daemon/service/ticker) scanning non-terminal work older than the per-state threshold.
- **FAILURE_MODE:** Watchdog faster than legitimate work → false kills (Dagster's start-timeout vs slow image pulls); remediation racing a legitimate transition (all four re-check state inside the remediation transaction).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** PING missions need a watchdog matrix keyed by mission state (especially any "waiting on agent" or "cancelling" equivalent), with per-mission timeout overrides like Dagster's tag.
- **HARVEST_CLASS:** ADOPT-DIRECTLY (the matrix shape + re-check-before-remediate).
- **FALSIFICATION:** Dagster has *four* separate monitors for four states in one file — the per-state (not per-run) decomposition is deliberate, and the "status changed during monitoring loop" early-return proves races were observed.
- **DEPENDENCIES:** M-01, M-03.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-12 CONCURRENCY-CAPS-POOLS-AND-SLOTS
- **PROBLEM:** Unbounded parallelism exhausts workers, APIs, and budgets; caps must be enforceable at schedule time, not just hoped for.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Airflow: Pools with slot counts, checked in the critical section. Dagster: `max_concurrent_runs` + `tag_concurrency_limits` ("claim" slots per pool; `_get_runs_to_dequeue` computes `max_runs_to_launch = max_concurrent_runs - len(in_progress)`). Prefect: concurrency limits v1 (tag) and v2 with **lease-held slots** — `SecureTaskConcurrencySlots` acquires a slot before RUNNING, `ReleaseTaskConcurrencySlots` releases on terminal; zero-limit aborts to prevent deadlock ("If the concurrency limit set on a tag is 0, the transition will be aborted to prevent deadlocks"). Hatchet: worker slot configs (`max_units` per slot type) + concurrency strategies (e.g., group round-robin) enforced in the assignment loop.
- **MATURITY:** Battle-tested. Prefect's zero-limit-deadlock abort is a subtle learned rule worth copying verbatim.
- **INVARIANT:** A slot is acquired before the work starts and released on terminal state; acquisition failure *defers* (requeue as Scheduled/wait) rather than failing the work; a zero cap is a configuration error, not "run nothing forever silently."
- **IMPLEMENTATION:** Counter with atomic increment-or-reject (Prefect `bulk_increment_active_slots`), pool row locks (Airflow), slot accounting in the assign loop (Hatchet).
- **FAILURE_MODE:** Slot leaks on crashes (Prefect's Repossessor exists precisely to decrement slots for expired leases); deadlock on zero caps (explicitly guarded).
- **PING_EXISTING_ANALOG:** UNKNOWN (per-pass caps exist in engagement machinery per AGENTS.md, but lease-held slot accounting for agent workers is unverified).
- **GAP:** PING needs slot accounting with crash-safe release (lease-backed, M-05) for agent workers and expensive tools; copy Prefect's zero-cap abort.
- **HARVEST_CLASS:** ADOPT-DIRECTLY.
- **FALSIFICATION:** Prefect's `Repossessor` (revoke expired lease → `bulk_decrement_active_slots`) exists *only* because slots leaked when holders died — the failure mode was observed and a dedicated reconciliation service was built.
- **DEPENDENCIES:** M-05, M-09.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-13 IDEMPOTENCY-AND-DUPLICATE-SUPPRESSION
- **PROBLEM:** Retried API calls, double-submitted runs, and at-least-once delivery create duplicate work unless the system dedupes.
- **SOURCE:** All four.
- **PINNED_SHA:** (all four)
- **SOURCE_LOCATION:** Prefect `PreventDuplicateTransitions` (flow rule) + `transition_id` in `StateDetails`; Airflow `BackfillDagRun.exception_reason`: `ALREADY_EXISTS` ("already exists") vs `IN_FLIGHT` — the backfill skips runs that already exist instead of erroring; Dagster: enqueue dedup (run ID uniqueness on submit); Hatchet `pkg/repository/idempotency.go` (idempotency keys on trigger).
- **MATURITY:** Production-hardened. The pattern is always: a client-supplied or derived key + a uniqueness constraint + "already exists" treated as success, not error.
- **INVARIANT:** Submitting the same work twice yields one unit of work; the second submit is acknowledged as a no-op.
- **IMPLEMENTATION:** Idempotency keys / unique constraints / transition IDs.
- **FAILURE_MODE:** Key scope too narrow → false dedup of distinct work; too broad → duplicates slip through.
- **PING_EXISTING_ANALOG:** BEST-EFFORT: AGENTS.md records a "duplicate-emission guard" in the PING/tandem pipeline — the concept exists; scope and enforcement point unverified.
- **GAP:** Verify the guard covers mission submission and agent action emission (not just tandem briefs); adopt transition-IDs on mission state changes (Prefect's `transition_id`).
- **HARVEST_CLASS:** VERIFY-THEN-ADOPT.
- **FALSIFICATION:** Airflow's `ALREADY_EXISTS` as a *stored, first-class* exception reason (not an error) shows duplicate submission is treated as a normal, expected event.
- **DEPENDENCIES:** None.
- **CONVERGENCE_COUNT:** 4/4.

---

### M-14 BACKFILL-AS-FIRST-CLASS-WITH-RESUMABLE-CURSOR
- **PROBLEM:** Re-running a parameterized sweep (dates, partitions) is not N ad-hoc runs; it needs its own lifecycle, ordering, concurrency cap, and resume-from-failure.
- **SOURCE:** Airflow, Dagster.
- **PINNED_SHA:** `eebf25…`, `32a16e…`
- **SOURCE_LOCATION:** Airflow `models/backfill.py`: `Backfill` entity (`from_date`/`to_date`, `reprocess_behavior` ∈ {FAILED, COMPLETED, NONE}, `max_active_runs`, `is_paused` pausing *creation* but not existing runs) + `BackfillDagRun` mapping table with `sort_ordinal` (ordered processing) and `exception_reason` (IN_FLIGHT/ALREADY_EXISTS idempotency). Dagster `_core/execution/backfill.py`: `PartitionBackfill` with `with_partition_checkpoint` (resumable cursor: "last_submitted_partition_name"), `with_failure_count`, `BulkActionStatus` state machine (REQUESTED → COMPLETED_SUCCESS / COMPLETED_FAILED / FAILED / CANCELING / CANCELED / FAILING).
- **MATURITY:** Production-hardened in both; notably both separate "the sweep's lifecycle" from "each run's lifecycle" and both made the sweep resumable.
- **INVARIANT:** A sweep has: target set, ordering, per-item idempotency, concurrency cap, checkpoint cursor, and its own terminal states distinguishing "done with failures" (COMPLETED_FAILED) from "infrastructure failed" (FAILED).
- **IMPLEMENTATION:** Mapping/association table (Airflow) or checkpointed record (Dagster); daemon iterates the cursor.
- **FAILURE_MODE:** Sweep-level failure vs item-level failure conflation (both systems explicitly separate them: `COMPLETED_FAILED` vs `FAILED`).
- **PING_EXISTING_ANALOG:** UNKNOWN. (Outreach engine runs sweeps, but whether sweeps are first-class resumable entities with cursors is unverified.)
- **GAP:** Any PING bulk operation (backfill-style reprocessing, bulk outreach waves) should be a first-class entity with checkpoint + the two-level failure distinction.
- **HARVEST_CLASS:** ADAPT.
- **FALSIFICATION:** Dagster's `BulkActionStatus.COMPLETED_FAILED` ("the backfill daemon completed successfully, but some runs failed") vs `FAILED` ("daemon failure") is the two-level failure distinction made explicit in the type system.
- **DEPENDENCIES:** M-01, M-10, M-13.
- **CONVERGENCE_COUNT:** 2/4 (Prefect and Hatchet have no backfill concept; Hatchet's durable-event replay is a different mechanism).

---

### M-15 CANCELLATION-AS-A-STATE-WITH-TIMEOUT
- **PROBLEM:** Cancellation is asynchronous — the worker may be mid-tool-call — so "cancel requested" and "cancelled" must be distinct, and the wait must be bounded.
- **SOURCE:** Dagster, Prefect, Hatchet.
- **PINNED_SHA:** (see Sources)
- **SOURCE_LOCATION:** Dagster `DagsterRunStatus.CANCELING` → `CANCELED`, with `monitor_canceling_run` enforcing `run_monitoring_cancel_timeout_seconds` (verified against the RUN_CANCELING event timestamp; on timeout `report_run_canceled`). Prefect `StateType.CANCELLING` → `CANCELLED`, `EnforceCancellingToCancelledTransition` rule, `cancellation_cleanup` service ("Responsible for cancelling tasks and subflows that haven't finished"; `CANCELLING_TIMEOUT` → "Flow run cancellation timed out; marked this flow run as Cancelled"). Hatchet: CANCELLED run/step statuses; queue items carry cancellation through the assign loop.
- **MATURITY:** Battle-tested. All three learned that cancellation needs a timeout — an uncooperative worker must not wedge the state machine forever.
- **INVARIANT:** CANCELING is a real state with a watchdog; on timeout the system force-transitions to CANCELLED and records why.
- **IMPLEMENTATION:** Request state + watchdog sweep + force-transition.
- **FAILURE_MODE:** Force-cancel while the worker later reports SUCCESS → conflicting terminal states (mitigated by M-02 guards ordering).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** PING mission cancellation (user says "stop") needs the CANCELING state + timeout + force path; without it, a stuck agent blocks mission teardown indefinitely.
- **HARVEST_CLASS:** ADOPT-DIRECTLY.
- **FALSIFICATION:** Prefect's `CANCELLING_TIMEOUT_CANCELLED_MESSAGE` ("Flow run cancellation timed out; marked this flow run as Cancelled") is a canned message — this path fires often enough to deserve a constant.
- **DEPENDENCIES:** M-01, M-11.
- **CONVERGENCE_COUNT:** 3/4 (Airflow has no explicit CANCELLING TI state; uses RESTARTING/clear semantics instead).

---

### M-16 ANTI-STAMPEDE-JITTER
- **PROBLEM:** Many schedulers/workers waking on the same cadence phase-lock and hammer shared resources in bursts.
- **SOURCE:** Hatchet, Airflow.
- **PINNED_SHA:** `073f45…`, `eebf25…`
- **SOURCE_LOCATION:** Hatchet `queuer.go` `nextPollInterval`: "always includes up to 50% random jitter. Jitter prevents queue loops created in the same batch (e.g. on lease acquisition or after a cron sweep touches many queues at once) from staying phase-locked and stampeding the connection pool in bursts." Airflow `next_retry_datetime`: deterministic jitter from `sha1(dag_id#task_id#logical_date#try_number)` — same anti-herd goal, but deterministic (no RNG state, reproducible).
- **MATURITY:** Production-hardened; both comments describe observed stampedes, not hypothetical ones.
- **INVARIANT:** Any fleet-wide periodic action (poll, retry) includes jitter; deterministic jitter is preferred where reproducibility matters.
- **IMPLEMENTATION:** Random 0–50% on poll intervals (Hatchet); hash-modulo on retry delays (Airflow).
- **FAILURE_MODE:** Jitter too large → latency tail; deterministic jitter with a bad key → correlated anyway.
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** PING's 2h/3h cron cadences across many passes are exactly the phase-locking risk Hatchet describes; add jitter to pass scheduling and use deterministic jitter for retry delays.
- **HARVEST_CLASS:** ADOPT-DIRECTLY (cheap, high value).
- **FALSIFICATION:** Hatchet's comment names the trigger ("after a cron sweep touches many queues at once") — this was a production incident turned into code.
- **DEPENDENCIES:** M-07, M-08.
- **CONVERGENCE_COUNT:** 2/4 explicit (Dagster/Prefect use fixed intervals with docket scheduling; the *problem* is acknowledged fleet-wide).

---

### M-17 LEASE-RENEWAL-BY-THE-WORKER (not the scheduler)
- **PROBLEM:** For long work, the *holder* must keep proving aliveness; scheduler-side heartbeats can't see inside the work.
- **SOURCE:** Prefect, Hatchet.
- **PINNED_SHA:** `148e99…`, `073f45…`
- **SOURCE_LOCATION:** Prefect `SecureFlowConcurrencySlots`: "The client will be responsible for maintaining the lease"; `ValidateDeploymentConcurrencyAtRunning` renews the lease at PENDING→RUNNING ("Attempt atomic renewal to prevent race conditions"); `RetryFailedFlows` carries `deployment_concurrency_lease_id` forward "so the run keeps renewing and eventually releasing it across the in-process retry." Hatchet `LeaseManager.loopForLeases` extends held leases every 5s (`leasesToExtend`).
- **MATURITY:** Production-hardened. The subtle learned point: renewal responsibility must survive *retries within the same process* (Prefect carries the lease ID across in-process retry — a bug-shaped edge they explicitly closed).
- **INVARIANT:** The entity doing the work renews; renewal is atomic (compare-and-hold); the lease ID travels with the work across retries.
- **IMPLEMENTATION:** Client renewal loop + atomic `renew_lease` + lease-ID propagation in state details.
- **FAILURE_MODE:** Renewal loop dies while work continues → lease stolen → double execution (the exact race Prefect's atomic renewal closes).
- **PING_EXISTING_ANALOG:** UNKNOWN.
- **GAP:** For PING's long agent tasks, the agent worker (not the mission scheduler) should renew its work lease; renewal must survive intra-mission retries.
- **HARVEST_CLASS:** ADAPT (TTL scaled to agent-task durations).
- **FALSIFICATION:** Prefect's comment "Revoking the lease here would fail the engine's next renewal" shows the renewal path is exercised across retries in production — the invariant is load-bearing, not aspirational.
- **DEPENDENCIES:** M-05.
- **CONVERGENCE_COUNT:** 2/4.

---

## 3. Convergence table (mechanism × system)

| # | Mechanism | Dagster | Prefect | Airflow | Hatchet | Count |
|---|---|---|---|---|---|---|
| M-01 | Explicit run state machine + terminal set | ✅ | ✅ | ✅ | ✅ | 4/4 |
| M-02 | Illegal-transition guards | ✅ invariants | ✅ rule pipeline | ✅ scheduler-mediated | ✅ conditional SQL | 4/4 |
| M-03 | Heartbeat-based liveness (suspicion) | ✅ daemon heartbeat | ✅ foreman | ✅ Job/TI heartbeats | ✅ 5s worker heartbeat | 4/4 |
| M-04 | Zombie-reap + orphan adoption w/ audit | ✅ resume bounded | ✅ foreman+repossessor | ✅ adopt/purge, history-first | ✅ lease steal | 4/4 |
| M-05 | Time-bounded lease, expiry-steal | ➖ single daemon | ✅ capacity leases | ➖ NOWAIT locks (equiv) | ✅ Lease table | 2 explicit / 3 w/ equiv |
| M-06 | Priority queue, FIFO within priority | ✅ stable sort | ✅ work-queue priority | ✅ priority_weight | ✅ priority+ID sort | 4/4 |
| M-07 | Server-sided retry w/ jittered backoff | ✅ RetryMode | ✅ reject→AwaitingRetry | ✅ deterministic jitter | ✅ backoff factor | 4/4 |
| M-08 | Bounded scheduler loop (per-phase budgets) | ✅ page_size | ✅ batch sizes | ✅ max_*_per_loop | ✅ refill limits | 4/4 |
| M-09 | Fail-fast single-writer critical section | ✅ re-validate | ✅ txn orchestration | ✅ NOWAIT + busy metric | ✅ queue leases | 4/4 |
| M-10 | Append-only state ledger | ✅ event log | ✅ state rows | ✅ TaskInstanceHistory | ✅ run event log | 4/4 |
| M-11 | Per-state watchdog matrix | ✅ 4 monitors | ✅ cancel/pause/late | ✅ heartbeat timeout | ✅ schedule/step timeout | 4/4 |
| M-12 | Concurrency caps, lease-held slots | ✅ tag limits | ✅ v1/v2 + leases | ✅ Pools | ✅ worker slots | 4/4 |
| M-13 | Idempotency / duplicate suppression | ✅ enqueue dedup | ✅ transition_id | ✅ ALREADY_EXISTS | ✅ idempotency keys | 4/4 |
| M-14 | Backfill as first-class w/ cursor | ✅ partition checkpoint | ❌ | ✅ Backfill entity | ❌ | 2/4 |
| M-15 | Cancellation as state + timeout | ✅ CANCELING | ✅ CANCELLING | ➖ no TI CANCELLING | ✅ CANCELLED | 3/4 |
| M-16 | Anti-stampede jitter | ➖ fixed | ➖ fixed | ✅ hash jitter | ✅ 50% poll jitter | 2/4 |
| M-17 | Worker-side lease renewal | ➖ | ✅ client renews | ➖ | ✅ extend loop | 2/4 |

**Strongest convergence (4/4):** M-01, M-02, M-03, M-04, M-06, M-07, M-08, M-09, M-10, M-11, M-12, M-13 — twelve mechanisms independently rediscovered by all four systems. These are the non-negotiable harvest list.

## 4. Lessons that do NOT transfer to LLM-agent autonomy

1. **Second-scale heartbeat cadences.** Hatchet's 5s worker freshness window assumes cheap, frequent check-ins. LLM agents make 10-minute tool calls and run on hosts that sleep; absence of heartbeat ≠ death (PING already learned this with the commute-blackout misattribution). Transfer the *suspicion-vs-proof* separation (M-03), not the timing.
2. **Deterministic DAG trigger-rule evaluation as the dependency model.** Airflow's `update_state` + trigger rules assume a closed, static graph. Agent task graphs are discovered at runtime; dependencies are semantic ("I need the pricing before I draft"), not structural. The *read path* (recompute schedulability from child states) transfers; the closed-graph assumption does not.
3. **Retry-everything with exponential backoff as default posture.** All four retry on the assumption that failures are usually transient and idempotent. LLM-agent failures are often *semantic* (wrong plan, bad tool args, model confusion) — blind retry compounds cost and can compound harm. PING needs failure *classification* before retry (transient/infra → M-07; semantic → replan; policy → escalate), which none of the four do server-side.
4. **Static priority queues.** (priority, FIFO) ordering assumes priorities are stable and comparable. Mission urgency for agents is dynamic and context-dependent; a stuck head-of-line mission is the norm, not an anomaly. Priority tags transfer as *hints*; strict queue ordering does not.
5. **Backfill semantics.** Recomputing historical partitions assumes idempotent, partitionable work. "Re-doing" an agent mission is not idempotent — the world changed, and the agent's prior outputs are evidence, not cache. M-14's *cursor + two-level failure* shape transfers to bulk operations; the "recompute the past" mental model does not.
6. **Process-level resume as recovery.** Dagster's `resume_run` with a new worker assumes the work is a pure function of (code, inputs, checkpoint). An agent's "checkpoint" includes conversational context, tool-side effects already performed, and judgment already exercised — resuming needs *context reconstruction*, not just process restart. M-04's audit-trail-before-reset transfers; the resume mechanism needs redesign.
7. **Schedule-instantiation as the primary trigger.** Prefect/Airflow/Dagster are cron/schedule-first; Hatchet is trigger-first. Autonomous agents are *goal/event*-first. The scheduler-loop machinery (M-08) transfers; the "timetable creates runs" worldview does not.
8. **Server-side transition veto for enumerable states.** Prefect's orchestration rules work because the state space is ~9 states. Agent "states" (planning, acting, waiting-on-human, reconsidering) are fuzzier and the transitions are semantic judgments. Guard the *lifecycle* (M-02) but don't try to enumerate every cognitive transition — that path leads to Prefect's emergent-rule-complexity failure mode.

## 5. Open questions

1. **What is the agent equivalent of "run state"?** Is it the mission lifecycle (M-01), the agent's plan state, or both? Who writes which?
2. **Who owns the transition decision when the worker is an LLM?** Prefect moved the retry decision server-side (M-07). For agents, can the server judge "this failure is transient" without understanding the task?
3. **Lease TTL sizing for unbounded-duration tasks.** Seconds (Hatchet) to minutes (Prefect grace periods) work for bounded steps. A 3-day mission with 6-hour silent stretches needs TTLs in hours — at which point is a lease still a lease vs a claim?
4. **Zombie detection via progress-evidence instead of heartbeats.** If heartbeats can't distinguish "thinking" from "dead," what is the observable? Candidates: tool-call deltas, artifact writes, token consumption, subagent spawning. None of the four systems had to solve this (their work is opaque-but-bounded).
5. **Does the append-only ledger (M-10) subsume the agent's memory?** Or are mission transitions and experiential memory two ledgers with different retention? (All four have retention/vacuum stories; agent memory grows unboundedly.)
6. **Optimistic vs pessimistic concurrency for agent artifacts.** M-05/M-09 are pessimistic (locks/leases). Agents editing shared artifacts may want CRDT/merge semantics instead — when is exclusion actually required?
7. **PING audit gap.** Most PING_EXISTING_ANALOG entries above are UNKNOWN — this lane did not read PING source. A targeted audit mapping PING's current mission lifecycle against M-01..M-17 is the highest-value follow-up; several mechanisms (M-10 ledger, M-13 dedup guard, M-07 retry) may already partially exist.
