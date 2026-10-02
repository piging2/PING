# RUN RECONSTRUCTION — what a bare ID gets you today

Branch: `refactor/runtime-authority-convergence` @ `cc6856c3b`. All statements grounded in source read this pass.

## 1. Given ONLY a `mission_id` (16-hex, sha256(`missionType:event_id`)[:16])

Reconstructable TODAY, from Postgres alone:

1. The mission row: `SELECT * FROM ping_missions WHERE mission_id = $1` — type, status, priority, full `payload` JSONB (includes `event_id`, `event_type`, `source`, `namespace`, `correlation_id`, `canonical_hash`, original business payload), `result` JSONB (on completion, includes `duration_ms` and `worker`), `error` text, `retries` count, `retry_at`, `lease_until`, `claimed_at`, `assigned_to`, `created_at/started_at/completed_at`. (`mission_runtime.js`)
2. The full causal event chain: `getTrace(missionId)` resolves the triggering event's `correlation_id` from `ping_events` (`payload.event_id` -> `metadata->>'correlation_id'`), then returns every event sharing that `correlation_id` ordered by timestamp — the complete upstream and downstream chain. Deterministic and replayable because every worker hop preserves `correlation_id`/`causation_id`/`namespace` (`canonical_workers.js` `BaseWorker._emit`). (`mission_runtime.js:360`)
3. Whether it was ever claimed, by whom, and when (`assigned_to`, `claimed_at`); whether its lease is currently live or expired (`lease_until` vs `NOW()`).
4. Whether it is awaiting retry (`retry_pending` + `retry_at`), exhausted (`failed` + `retries`), or dead-lettered (join `repository_dead_letters.mission_id` — full original payload, error message + stack, retry count, `replayable` flag, witness).
5. Its triggering business event and every downstream emission (via the trace), including `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED` lifecycle events in `ping_events`.

LOST (not recoverable from the ID today):

1. In-flight progress: a mission in `running`/`assigned` has no step-level state. There are no mission checkpoints; `CheckpointAuthority` checkpoints are Ollama/session scope, not mission scope.
2. Which scheduler instance owned it: `_processing` is an in-memory `Set` in `MissionScheduler`, gone with the process. After restart you cannot tell whether `running` means "actively worked" or "orphaned"; only the lease timestamp hints at it.
3. Attempt history: `retries` is an integer. There are no per-attempt records (no attempt IDs, no per-attempt start/end, no per-attempt worker). The fencing-token/`attempts` column from ce002 (`e02960f0f`) is on other branches, not this one.
4. Scheduler session stats (`dispatched/completed/failed/skipped/renewals`) and worker stats (`totalProcessed`, heartbeats): in-memory, `scope: 'session'`, lost on restart.
5. Worker-internal state: `WorkerRuntime` registry (worker objects, `maxConcurrent`, `running` counters) is rebuilt from code at boot, not from durable state. `entry.worker._event` (the in-flight event pointer) is transient by design.
6. Whether external side effects happened: the system records emissions, not effects. A `completed` mission proves the worker returned ok; it does not prove the downstream tool committed (F8 gap). There is no effect-receipt table.
7. Events orphaned in the emit/dispatch gap (F13): an event with no mission leaves no pointer from the mission side; you can find it only by scanning `ping_events` for event types that should have produced missions (via `EVENT_MISSION_MAP`) and anti-joining `ping_missions.payload->>'event_id'`.

## 2. Given ONLY an `event_id` (64-hex content hash)

Reconstructable: the event row; its children/descendants via `getChildren`/`getDescendants` (causation chain, `unified_event_runtime.js`); the mission it produced, if any (`ping_missions` where `payload->>'event_id' = $1`, deterministic `mission_id` recomputable as sha256(`missionType:event_id`)[:16]); the full correlation group. Lost: same list as above from the mission side.

## 3. Given ONLY a dead-lettered job

`repository_dead_letters` carries everything needed to rebuild the work packet by hand: `original_job_id`, `job_type`, `mission_id`, `correlation_id`, `causation_id`, full `payload`, `error_message`/`error_stack`, `retry_count`, `replayable`. What is missing is the machine action: no replay consumer exists, so reconstruction stops at human-readable evidence.

## 4. The precise delta to full RUN_ID reconstruction

"Full" means: from a RUN_ID alone, after arbitrary process death, reconstruct (a) canonical run identity, (b) per-attempt identity and history, (c) current position including partial progress, (d) effect reconciliation (what committed vs what is unknown), (e) safe resume or fenced re-execution — with no required in-memory state.

| # | Missing piece | What exists today | Delta |
|---|---|---|---|
| 1 | Canonical RUN record | `ping_missions` row is the de-facto run record (deterministic id, durable) | Small: bless `mission_id` as the RUN_ID contract explicitly; document that it is recomputable from (`missionType`, `event_id`) |
| 2 | Attempt identity | Only a `retries` integer; no attempt rows, no fencing token | Add per-attempt records (or the ce002 `attempts` column + fencing token on `complete()`); the fix exists on `constitutional-convergence-v2` (`e02960f0f`) and needs merging, not inventing |
| 3 | Completion fencing | `complete()` accepts any caller while `status='running'`; zombie completions accepted | Same merge: STALE_ATTEMPT fail-closed on token mismatch |
| 4 | Crash-reclaim exhaustion | `reapExpiredLeases` ignores `retries`/`max_attempts`: unbounded redispatch of crash-looping missions | Gate reclaim on an attempt budget or route repeated reclaims to DLQ |
| 5 | Bridge catch-up (event->mission gap) | `EventToMissionBridge` is subscribe-only; orphaned events never recovered | Add the reconciliation pass from `f4bf5304a` (or a startup scan: mapped event types in `ping_events` with no matching mission row) |
| 6 | Startup reconciliation | None on this boot path | Merge `6a342dd27` or equivalent: on boot, reconcile `assigned`/`running` rows against leases before polling starts |
| 7 | UNKNOWN outcome representation | No state; ambiguity is implicit (`running` + stale lease) | Add an explicit `OUTCOME_UNKNOWN`/`effect_unknown` marker set when a timeout/partition separates the effect from its receipt, plus a verification hook before retry |
| 8 | Effect receipts | Events record emissions, not external commits | Record tool effect receipts (idempotency key + commit ack) per attempt; retry only after receipt check |
| 9 | Checkpoint/resume for long missions | None at mission scope | Only needed if missions grow long-running; today missions are single `handle()` calls, so row+lease is sufficient IF fencing (2,3) lands |
| 10 | DLQ replay | Durable DLQ, `replayable=true`, no consumer | A replay path (human-triggered is fine, but it must exist and be tested) |
| 11 | Graceful drain | `GracefulShutdown` unwired; SIGTERM kills mid-dispatch | Wire it (or document kill-tolerance as the design and rely on lease reclaim, but then the double-execute window in F2 must be fenced per #3) |
| 12 | Hung-worker watchdog | No timeout on `dispatch`; live scheduler renews a stuck mission's lease forever | Add a dispatch deadline or a stuck-lease detector (lease renewed N times with no progress event => `OUTCOME_UNKNOWN` + page) |

Net: the durable spine (D1-D4) already satisfies "no required in-memory state" for identity and history. The reconstruction gaps are all on the write path under failure: fencing, attempt records, bridge catch-up, explicit UNKNOWN, and replay. Three of the five hard pieces already exist as commits on sibling branches (`e02960f0f`, `f4bf5304a`, `6a342dd27`); the remaining work is merge + the genuinely new pieces (UNKNOWN representation, effect receipts, watchdog, DLQ replay).
