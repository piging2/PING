# STATE-RECOVERY MAP — ORCA FINISH Wave 1, Lane C3

Inspected: `/home/nolan/ping` @ `cc6856c3b`, branch `refactor/runtime-authority-convergence`.
Method: read-only source inspection via `pigwsl-run.sh`. Nothing was written to the repo.
Date: 2026-09-23.

Scope: the LIVE mission path is `EventBridge -> UnifiedEventRuntime (ping_events) -> EventToMissionBridge -> MissionRuntime (ping_missions) -> MissionScheduler -> WorkerRuntime -> 8 canonical workers`, wired in `gateway/bootstrap/gateway_runtime.js` (lines 476-580). Everything below is about that path unless noted.

## 1. Durable-state inventory

| # | Durable state | Where (table / file) | Written by | Durability guarantee | Restart semantics | Class |
|---|---|---|---|---|---|---|
| D1 | Canonical events | `ping_events` (PK `event_id` SHA-256 of `{eventType, source, [namespace], [logical_id\|payload]}`) | `UnifiedEventRuntime.emit` (`ping-runtime/events/unified_event_runtime.js:44`) | Postgres row; `INSERT ... ON CONFLICT (event_id) DO NOTHING`; semantic-collision check fails closed; fail-closed when no pool (`"No persistence available: event not durably stored"`) | Append-only journal; fully re-readable; projector rebuilds from it | LIVE |
| D2 | Mission records | `ping_missions` (`mission_id` PK = sha256(`missionType:event_id` or canonical payload)[:16]; statuses `created/assigned/running/completed/failed/retry_pending`; cols `result`, `error`, `retries`, `retry_at`, `lease_until`, `claimed_at`, `assigned_to`) | `MissionRuntime` (`ping-runtime/orchestration/mission_runtime.js:30`) | Postgres row; `ON CONFLICT DO NOTHING` create; all transitions are conditional `UPDATE ... WHERE status IN (...)` (atomic claim: `WHERE status='created'`) | Full row survives; scheduler re-derives work from it on boot | LIVE |
| D3 | Bridge cursors | `ping_bridge_cursors` (`source`, `last_event_id`) | `EventBridge` (`ping-runtime/events/event_bridge.js:52`) | Postgres upsert per batch | Restored in `initialize()` before `start()`; bridging resumes after cursor | LIVE (with gaps, see F-cases) |
| D4 | Dead letters | `repository_dead_letters` (full payload, `error_message`, `retry_count`, `replayable BOOLEAN DEFAULT true`, `witness`) | `DeadLetterAuthority.recordDeadLetter` (`gateway/dead_letter_authority.js:54`), called from `MissionScheduler._failMission` on retry exhaustion | Postgres row | Durable; queryable; NO automated replay consumer exists | LIVE (write path only) |
| D5 | Approvals / policies | `approvals`, `approval_policies` | `ApprovalAuthority` (`gateway/approval_authority.js:49,63`) | Postgres rows | Durable; pending approvals survive restart | LIVE (table); workflow use via Temporal path, see D11 |
| D6 | Projection tables | `ping_objects`, `ping_relationships`, `ping_transitions` (`database/ping_objects.sql`) | `ping-projector.ts` (`runtime/constitutional/src/`) | Postgres rows | Explicitly DERIVED: "can be destroyed and rebuilt from canonical history" in `ping_events`; ordering contract `(sequence, created_at, event_id)` | LIVE (as derived cache) |
| D7 | Session checkpoints | `checkpoints` (`checkpoint_id`, `session_id`, `checkpoint_type`, `checkpoint_data`, `checkpoint_hash`) + witness via `witnessAuthority` | `CheckpointAuthority` (`gateway/checkpoint_authority.js:46`) | Postgres row + canonical hash witness | `restoreCheckpoint` / `getLatestCheckpoint` by session | LIVE (Ollama/session scope only; NOT mission scope) |
| D8 | Worker learning memory | `ping-runtime/orchestration/worker_memory/*.json` | `WorkerMemory._persist` (plain `fs.writeFileSync`, no fsync) | Filesystem write; reloaded in constructor | Findings/patterns survive; NOT work-packet state | LIVE (narrow purpose) |
| D9 | Filesystem artifacts | `ping-runtime/orchestration/artifact_store/art_*.json` | artifact pipeline | Filesystem JSON | Content-addressed by filename hash; re-readable | LIVE (evidence; write path not fully traced this pass) |
| D10 | Gateway mission tables | `mission_events`, `mission_executions` (thin: `execution_id, mission_id, execution_status, execution_data, created_at, updated_at`), `event_outbox`, `repository_events`, `execution_graphs`, `repository_snapshots`, `telemetry_metrics` | `gateway/migration_engine.js:193-410` | Postgres `CREATE TABLE IF NOT EXISTS` | Schema exists; thin `mission_executions` has no observed live writer | LIVE (schema) / DORMANT (writers) |
| D11 | Temporal workflow state | Temporal server (external) | `mission_workflow.js` (`ping-runtime/temporal/workflows/`) | Temporal history (if a server is running) | Workflow resume/retry owned by Temporal | DORMANT in current boot: `gateway_runtime.js` has NO Temporal wiring; `temporal_runtime.js` is only required by `gateway/bootstrap/wiring.js` (an alternate boot path), never by the live `gateway_runtime.js` |
| D12 | Competing checkpoint writers | `checkpoints` table, second shape (`mission_id, execution_id, ...`) | `CheckpointRepository` (`gateway/repositories/checkpoint_repository.js`) | NONE: its INSERT references columns the live `checkpoints` table does not have; zero `require()` callers found | N/A | DEAD (unreferenced + schema-incompatible) |
| D13 | Competing execution writer | `mission_executions` rich shape (`context_hash, prompt_hash, patch_hash, replay_hash, approval_status, commit_hash, witness_hash, checkpoint_id, started_at, completed_at, execution_result`) | `ExecutionRepository` (`gateway/repositories/execution_repository.js`) | NONE: `migration_engine.js` creates only the thin shape; INSERT would fail; zero callers | N/A | DEAD (unreferenced + schema-incompatible) |
| D14 | Advisory locks | `pg_try_advisory_lock` via `AdvisoryLock` (`gateway/advisory_lock.js`) | nobody | N/A | N/A | DORMANT (class exists, zero callers; "every mutable aggregate must have one writer" is unenforced) |
| D15 | Graceful shutdown | `GracefulShutdown` (`gateway/graceful_shutdown.js`): SIGTERM/SIGINT handlers, drain, 30s timeout | nobody | N/A | Not wired: `gateway/server.js` (19 lines) never requires it; `GatewayRuntime.shutdown()` only stops the kernel adapter | DORMANT |

Classification key: LIVE = on the wired boot path with durable effect. DORMANT = code exists, not wired. DEAD = unwired AND broken (schema-incompatible or unreferenced). CLAIMED-ONLY = asserted in docs/history but absent from this branch.

## 2. The reconciler: what actually exists

The prior-facts "repaired reconciler with state lifecycle OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED" **does not exist** on this branch. Verified: case-insensitive full-repo grep for `KNOWN_PERMANENT`, `REOPENED` returns zero hits (excluding node_modules); no file defines a reconciler class; the only "reconcile" hits are the comment "PATCH 7B: reconciled to the live canonical journal" in `ping-projector.ts` and doc filenames. CLASSIFY: CLAIMED-ONLY (phantom on this branch).

What exists instead (three separate, uncoordinated mechanisms):

(a) **Mission status machine** (`mission_runtime.js`): `created -> assigned -> running -> completed | failed | retry_pending -> created | failed -> dead_letter`. Conditional transitions only (P0-1/P0-3); `complete()` only from `running`; `fail()` from `running/assigned/retry_pending`; second `complete()` on a non-running mission is a silent no-op (EVAL-006 proves forward-only). There is NO `UNKNOWN` / `OUTCOME_UNKNOWN` state. A mission whose worker died or hung sits in `running` (or `assigned`) until the lease reaper moves it; the UNKNOWN is implicit, never represented.

(b) **Lease reaper** (`reapExpiredLeases`, `mission_runtime.js:291`): resets `running/assigned` with `lease_until < NOW()` back to `created` (emits `MISSION_LEASE_EXPIRED`). It does NOT increment `retries` and does NOT consult `max_attempts`: the crash-reclaim path has **no exhaustion cap**. Repeated crash -> reclaim -> redispatch is unbounded.

(c) **Retry ladder** (`failWithRetry` + scheduler `_failMission`): `retries` increments only on the explicit fail path; `max_attempts` (default 3) -> `failed` -> `DeadLetterAuthority.recordDeadLetter` (durable, `replayable=true`, but no replay consumer; human action).

Git archaeology (read-only `git show`/`merge-base`): the hardening that would have closed these gaps exists as commits on OTHER branches only, not ancestors of HEAD `cc6856c3b`:
- `e02960f0f` "fix(ce002): attempt/lease fencing for mission completion" (STALE_ATTEMPT, `attempts` column, fencing tokens, `reconcileLostCompletions`) — on `constitutional-convergence-v2`, `convergence-discovery-2026-09-20`. ABSENT here.
- `f4bf5304a` "feat(orchestration): durable event→mission reconciliation" (bridge catch-up) — on `constitutional-convergence-authority-law`. ABSENT here.
- `6a342dd27` "feat(orca): durable objective identity, crash-safe dispatch rendezvous, startup reconciliation" — on `constitutional-convergence-v2`, `feature/orca-autonomy`. ABSENT here.

Consequence: on THIS branch there is no attempt/fencing identity, no bridge reconciliation pass, and no startup reconciliation. The per-failure table below is written against what is actually on the branch.

## 3. Per-failure-case table

Notation: DURABLE = already on disk and re-readable. RECONSTRUCTED = derived at/after restart from durable state. RETRIED = automatically attempted again. RECLAIMED = moved back to a claimable state. DOUBLE-EXECUTE = can the side effect run twice. OUTCOME_UNKNOWN = is ambiguity represented or merely implicit.

### F1. Worker process dies (worker handle throws mid-mission)

- DURABLE: mission row (`running`, `error` set on fail path), all events emitted before the throw (each `emit` persists before dispatching handlers), `retries` count after `failWithRetry`.
- RECONSTRUCTED: nothing needed; scheduler continues in the same process.
- RETRIED: yes. `WorkerRuntime.dispatch` rethrows (P0-2, `worker_runtime.js:119`) -> scheduler `_failMission` -> `failWithRetry` -> `retry_pending` with `retry_at = now + backoff` (default 5s) -> `getPending()` picks it up after backoff. Up to `max_attempts` (default 3).
- RECLAIMED: n/a.
- DOUBLE-EXECUTE: YES, possible. The worker may have produced external side effects before throwing; retry re-runs the whole mission. No idempotency key is passed to external tools on this branch.
- OUTCOME_UNKNOWN: implicit only. Between throw and `failWithRetry` there is no UNKNOWN marker; after, status is `retry_pending`/`failed` with `error` text. Effects already emitted downstream are NOT rolled back.
- HUMAN ACTION: only after exhaustion: mission -> `failed` + DLQ row (`replayable=true`); replay is manual.

### F2. Coordinator (scheduler/gateway process) dies

- DURABLE: everything in Postgres (`ping_events`, `ping_missions` with current status/lease, bridge cursors, DLQ).
- RECONSTRUCTED: on boot, `GatewayRuntime` re-runs `initialize()` for all runtimes, re-registers the 8 canonical workers (in-memory `WorkerRuntime` registry rebuilt from code), resubscribes `EventToMissionBridge` handlers, restarts `EventBridge` from persisted cursors, restarts `MissionScheduler.start()` (poll loop). The scheduler's in-memory `_processing` Set is LOST (empty on boot).
- RETRIED: yes, indirectly. In-flight missions keep `running`/`assigned` with a 60s `lease_until`; nobody renews (scheduler dead) -> `reapExpiredLeases()` on the next live scheduler poll resets them to `created` -> re-dispatched. Note: reclaimed missions do NOT consume a `retries` budget (unbounded reclaim loop for crash-looping missions).
- RECLAIMED: yes, via lease expiry (worst case ~60s + one poll cycle after a scheduler is alive again).
- DOUBLE-EXECUTE: YES, possible. If the old worker was actually still alive (split-brain, e.g. network partition where the worker host kept running but lost DB), the re-dispatched mission runs concurrently with the zombie. This branch has NO fencing token (ce002 absent), NO advisory locking (DORMANT), and `complete()` only checks `status='running'` — a zombie's late `complete()` is accepted.
- OUTCOME_UNKNOWN: implicit: `running` with an expired-but-not-yet-reaped lease, or `assigned` never started. No UNKNOWN state exists.
- HUMAN ACTION: none required for the standard case; required if the same mission crash-loops forever (no cap on the reclaim path).

### F3. Process dies (same as F2 for this architecture)

Same as F2. The mission path is single-process (`gateway_runtime.js`); there is no separate worker-process topology on the live path, so "worker dies" (F1) vs "process dies" (F3) differ only in whether the scheduler survives to run the retry ladder. If the whole process dies, the retry ladder never runs; recovery is lease-reclaim only.

### F4. Host restarts (OS reboot)

- DURABLE: Postgres data (assuming the DB is on persistent storage and was checkpointed by Postgres itself; no app-level fsync beyond Postgres defaults). Filesystem artifacts (`artifact_store`, `worker_memory`) survive if the disk does.
- RECONSTRUCTED: everything in F2, plus Postgres crash recovery is Postgres's own (WAL). The app performs no additional journal replay; `initialize()` uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so it is restart-idempotent.
- RETRIED / RECLAIMED: as F2.
- DOUBLE-EXECUTE: as F2.
- OUTCOME_UNKNOWN: as F2 (implicit).
- HUMAN ACTION: none for the standard case, beyond bringing the host and Postgres back.

### F5. Network disappears (app <-> Postgres partition)

- DURABLE: whatever was committed before the partition. In-flight `pool.query()` calls throw.
- RECONSTRUCTED: nothing automatic. `pg.Pool` default behavior applies (no app-level reconnect/backoff/retry policy on the mission path; `circuit_breaker.js` exists but is unwired).
- RETRIED: partially. `emit()` persist failure -> `{status:'error'}` (fail-closed, caller sees the error; the event is NOT durable and NOT queued for later). Scheduler `_poll` catches poll errors and logs ("non-fatal"); `_dispatch` failure -> `_failMission` -> retry ladder continues once the DB returns. `EventBridge` cursor-persist failure is swallowed (`catch (_)`), so the cursor may lag and the batch re-bridges on recovery (dedup via `ON CONFLICT DO NOTHING` + the `NOT IN` subquery makes this safe).
- RECLAIMED: no. Leases cannot be renewed or reaped without the DB; missions freeze in their last persisted status until connectivity returns. Renewal failures are logged per poll; if renewal fails long enough, the reaper (which also needs the DB) cannot run either, so there is no spurious reclaim during a pure network partition.
- DOUBLE-EXECUTE: YES, the classic split-brain: if the worker host can still reach external tools but not Postgres, it keeps executing while a live scheduler elsewhere reclaims the expired lease and redispatches. No fencing exists to stop the zombie.
- OUTCOME_UNKNOWN: implicit (`running` with stale lease).
- HUMAN ACTION: restore network; inspect for duplicate side effects if a partition overlapped a lease expiry.

### F6. DB temporarily disappears (Postgres down, app alive)

Same mechanics as F5, plus: `UnifiedEventRuntime.emit` fails closed (returns error, nothing persisted, nothing dispatched to handlers: note dispatch happens AFTER persist in `emit`, so a DB outage also pauses the entire in-process event pipeline). `MissionRuntime` methods throw to callers. The scheduler degrades to logging poll errors. `EventToMissionBridge._handleEvent` catches create failures, increments `_stats.failed`, and the mission is NEVER created for that event: the event itself was also not persisted (emit failed first), so the business fact is lost unless the original emitter retries. No outbox, no spillover queue: **DB-down during emit = data loss of that event** (by design: fail-closed rather than buffered).

### F7. Tool times out BEFORE any effect

There is no tool-level timeout on the mission dispatch path: `WorkerRuntime.dispatch` awaits `worker.handle(event)` with no deadline, and `MissionScheduler._dispatch` awaits `dispatch` with no deadline. So "timeout before effect" as a typed outcome does not exist here. What exists:
- `runtime/tool_router.py:29` `run_script(path, args, timeout=15)` — a 15s timeout for script tools in the legacy Python router (not on the JS mission dispatch path).
- Temporal activities (`mission_workflow.js`) declare `startToCloseTimeout: 5 minutes` with retry policy (max 3 attempts) — DORMANT in the live boot (no Temporal wiring in `gateway_runtime.js`).
- If a worker's awaited call hangs forever: the scheduler poll is stuck in `_dispatch`; the mission stays in `_processing`; Arrow 0 of subsequent overlapping polls keeps RENEWING its lease forever (renewal is unconditional for `_processing` members), so the reaper never reclaims it: **a hung worker with a live scheduler = mission stuck `running` indefinitely, no retry, no alert, no stuck-detection in code**. This is the closest thing to a permanent silent UNKNOWN on this branch.
- DURABLE: the mission row; whatever events were emitted before the hang.
- HUMAN ACTION: kill/restart the process (then F2 recovery applies), or fix the hung worker. There is no watchdog.

### F8. Tool times out AFTER the effect (ambiguity: did it commit?)

- DURABLE: the mission row (still `running`); any events the worker emitted before the timeout; the external effect (unknown to the system).
- RECONSTRUCTED: nothing; the ambiguity is not represented. There is no `OUTCOME_UNKNOWN` state, no effect-reconciliation pass, no "verify-then-complete" step on this branch.
- RETRIED: only if the worker surfaces the timeout as a throw (then F1) or the process dies (then F2/F3 reclaim). If the worker swallows the timeout and returns ok, the mission completes as if the effect succeeded.
- DOUBLE-EXECUTE: YES if retried/reclaimed: the retried mission re-runs the tool; external systems see the effect twice. No idempotency token is minted for external calls.
- OUTCOME_UNKNOWN: NOT represented. This is the honest gap: timeout-after-effect collapses to either `running`-forever (hang), `retry_pending`/`failed` (throw), or `completed` (swallowed). None of them records "effect state unknown".
- HUMAN ACTION: reconcile externally (check the downstream system), then manually mark/complete/fail the mission.

### F9. Checkpoint is stale (resume from old state)

Mission scope: there are NO mission checkpoints on this branch, so a stale mission checkpoint cannot occur; resume is always from the mission row + lease, never from a snapshot. (CheckpointAuthority checkpoints are Ollama/session scope, hash-witnessed at creation; `restoreCheckpoint`/`getLatestCheckpoint` read by `session_id`; no version-fencing on restore was observed, but a stale session checkpoint only affects conversational/session state, not mission truth.)
The analogous staleness that CAN occur: `EventBridge` cursor persisted per batch AFTER the loop (event_bridge.js:205-215). If the process dies mid-batch, the cursor was not yet advanced, so the batch re-bridges on restart: safe, because `emit` dedups on content-addressed `event_id` (`ON CONFLICT DO NOTHING`) and the bridge additionally filters `event_id NOT IN (SELECT event_id FROM ping_events WHERE source='repository_events')`. Cursor-before-work never happens here (cursor advances after work), so the failure mode is at-least-once, not loss. One real gap inside the batch: the cursor advances to the LAST row of the batch even if a middle row's emit failed (caught per-row, loop continues). A failed middle row is then skipped permanently on restart (cursor jumped past it). That is silent loss of one bridged event, mitigated only if the source table is re-scanned manually.

### F10. Two workers claim the same packet

- The atomic claim (`UPDATE ... WHERE mission_id=$2 AND status='created'`, `mission_runtime.js:117`) makes simultaneous double-claim impossible through the SQL path: the loser gets `rowCount=0`. `test_durability_invariants.js` asserts two scheduler cycles cannot execute the same mission concurrently.
- The remaining double-claim vector is temporal, not concurrent: lease expiry + reclaim (F2/F5). The reclaimed mission is legitimately re-claimed (by design, at-least-once), and without fencing (ce002 absent) a still-running first attempt's late `complete()` is accepted (`WHERE status='running'` passes), emitting a second `MISSION_COMPLETED` for the same mission. So: concurrent double-claim NO; sequential double-execution after reclaim YES.
- `AdvisoryLock` (pg advisory locks) would be the extra guard; it has zero callers (DORMANT).

### F11. Lease expires mid-work (slow worker, healthy otherwise)

- DURABLE: mission row; partial events already emitted.
- RECONSTRUCTED: n/a (scheduler alive).
- RETRIED: the reaper resets the mission to `created` and a second dispatch starts the work from scratch while the first attempt may still be running. The first attempt's eventual `complete()` is accepted (no fencing) and may overwrite/duplicate the second attempt's outcome; `MISSION_COMPLETED` can be emitted twice for one mission (the collision gate in `UnifiedEventRuntime.emit` does NOT stop this: the two completions have different timestamps in payload, and CE-001's deterministic completion identity via `logical_id` — commit `c5c41b58c` — is about `MISSION_COMPLETED` event identity; two genuinely separate completion calls produce separate logical emissions).
- RECLAIMED: yes, to `created`, by `reapExpiredLeases` (emits `MISSION_LEASE_EXPIRED`).
- DOUBLE-EXECUTE: YES (the two attempts overlap in time).
- OUTCOME_UNKNOWN: implicit; both attempts believe they are the legitimate one.
- HUMAN ACTION: none automatic; tune `lease_until` (60s default) / `maxConcurrent` / poll interval, or fix the slow worker. Note the scheduler renews leases for `_processing` members every poll, so mid-work expiry while the scheduler is alive only happens if renewal itself fails (DB issue) or the mission is not in `_processing` (e.g. claimed by another scheduler instance).

### F12. Git conflict occurs

No machine mechanism. `merge_gate.js` is a static code-quality gate (no `Date.now()`, no `Math.random()`, etc.), not a merge-conflict resolver. A git conflict in a worker's working tree / repo is outside the runtime's purview: missions that shell out to git would fail via the normal throw -> retry ladder path; resolution is HUMAN ACTION. (The `worktrees/` directories in the repo are agent working trees; conflicts there are operator-resolved.)

### F13. Event persisted but mission never created (emit/dispatch gap)

- DURABLE: the event row in `ping_events` (persist precedes handler dispatch in `emit`, steps 5 then 6).
- RECONSTRUCTED: nothing. `EventToMissionBridge` is a pure in-memory subscription (`eventRuntime.on(...)`); it has no cursor and no catch-up pass on `start()`. If the process dies between step 5 (persist) and step 6 (bridge handler), or if the bridge handler throws (DB down), the mission is never created and no component ever notices: the event is orphaned. Deterministic `mission_id` means a manual re-emit (or re-bridge) is safe (no duplicate), but nothing triggers it automatically. The "durable event→mission reconciliation" commit (`f4bf5304a`) that would close this gap is on another branch, not here.
- HUMAN ACTION: detect (event with no corresponding mission) and re-emit / manually create the mission.

## 4. Mechanism record (per-mechanism classification)

| Mechanism | File / symbol | State read | State written | Durability | Restart semantics | Test coverage | Class |
|---|---|---|---|---|---|---|---|
| Content-addressed emit + dedup | `unified_event_runtime.js` / `emit()` | validator, governance | `ping_events` row | Postgres; fail-closed, no pool => error | Journal re-readable; projector rebuilds | EVAL-001 (idempotent re-ingest) | LIVE |
| Deterministic mission identity | `mission_runtime.js` / `create()` | `ping_missions` (conflict check) | mission row, `MISSION_CREATED` | `ON CONFLICT DO NOTHING` | Same event => same mission_id after restart | EVAL-001 | LIVE |
| Atomic claim | `mission_runtime.js` / `assign()` | `status='created'` | `assigned`, `assigned_to`, `claimed_at`, `lease_until=+60s`, `MISSION_ASSIGNED` | Single conditional UPDATE | Loser gets rowCount 0 | `test_durability_invariants` #5 | LIVE |
| Conditional transitions | `start/complete/fail` | current status | status, `started_at/completed_at`, `result`, `error` | Conditional UPDATE | Forward-only; EVAL-006 | EVAL-006 | LIVE |
| Lease renew + reap | `renewLease` / `reapExpiredLeases` + scheduler Arrows 0-1 | `_processing` (mem), `lease_until` | `lease_until`, reclaim to `created` | Postgres | Orphaned in-flight work reclaimed ~60s after scheduler death | `test_lease_renewal`, `test_durability_invariants` #3-4 | LIVE (reclaim path has NO retry cap) |
| Retry ladder + DLQ | `failWithRetry` / `_failMission` / `DeadLetterAuthority` | `retries` | `retry_pending`/`failed`, `repository_dead_letters` | Postgres | Backoff via `retry_at`; exhaustion durable | `test_durable_mission_lifecycle` (P0-4/P0-5), `test_dead_letter_wiring` | LIVE (DLQ write only; replay manual) |
| Bridge cursor | `event_bridge.js` / `_bridgeRepositoryEvents`, `_bridgeCanonicalEvents` | `ping_bridge_cursors`, source tables | `ping_events` rows, cursor upsert | Postgres | Resume after cursor; at-least-once | none observed | LIVE (mid-batch failure => skip, F9) |
| Mission trace | `mission_runtime.js` / `getTrace()` | mission row, `payload.event_id`, `ping_events` by `correlation_id` | none (read) | n/a | Full causal chain rebuildable from one mission_id | none observed | LIVE |
| Projection rebuild | `ping-projector.ts` | `ping_events` ordered by `(sequence, created_at, event_id)` | `ping_objects/relationships/transitions` | Derived; rebuildable | Destroy-and-rebuild supported | `ping-projector.integration.test.ts`, `ping-vocabulary.test.ts` | LIVE (derived) |
| Session checkpoints | `checkpoint_authority.js` | `checkpoints` by session | checkpoint row + witness | Postgres | `restoreCheckpoint` by id | none observed | LIVE (session scope) |
| Fencing / STALE_ATTEMPT | (ce002, other branches) | — | — | — | — | CE-002 suite (other branches) | CLAIMED-ONLY on this branch |
| Bridge reconciliation / startup reconciliation | (f4bf5304a, 6a342dd27, other branches) | — | — | — | — | — | CLAIMED-ONLY on this branch |
| Reconciler OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED | nowhere | — | — | — | — | — | PHANTOM (zero hits) |
| Advisory locking | `gateway/advisory_lock.js` | — | — | — | — | `ADVISORY_LOCKING_IMPLEMENTATION.md` (doc) | DORMANT |
| Graceful shutdown | `gateway/graceful_shutdown.js` | — | — | — | — | none observed | DORMANT |
| Temporal durable workflow | `temporal_runtime.js`, `mission_workflow.js` | Temporal history | Temporal history | External server | Full resume/retry owned by Temporal | none observed | DORMANT in live boot |
| Rich execution/checkpoint repositories | `repositories/execution_repository.js`, `repositories/checkpoint_repository.js` | — | would-be `mission_executions`/`checkpoints` | NONE (schema mismatch) | — | none observed | DEAD |

## 5. Open questions / blockers

1. Which Postgres is the live one for the gateway (connection string / host), and is `CREATE TABLE IF NOT EXISTS` in `initialize()` the actual migration path in production, or is there an external migration runner? (Affects whether the thin `mission_executions` shape is really what is live.)
2. Is `pg.Pool` configured with any statement timeout / connection retry, or pure defaults? (Determines F5/F6 behavior precisely.)
3. Does any operator runbook exist for DLQ replay (F1/F8 follow-up), or is `replayable=true` currently write-only?
4. The `event_id > last_event_id` TEXT comparison in the bridge cursor assumes monotonic event_ids; if event_ids are content hashes, cursor pagination can skip or repeat rows. Worth one verification query against live data.
5. Confirm no second scheduler instance runs concurrently (the lease design assumes a single live scheduler per DB; two live schedulers would still be safe on claim but would double renew/reap traffic and double DLQ writes are guarded only by the `retries >= max_attempts` check racing).

## 6. Inspection log

20 files/sections read via `pigwsl-run.sh` (read-only), 3 commits archaeology-checked (`e02960f0f`, `f4bf5304a`, `6a342dd27` confirmed not ancestors of HEAD), full-repo greps for `KNOWN_PERMANENT`/`REOPENED` (0 hits), `reconciler` (build artifacts only), `SIGTERM` wiring, `AdvisoryLock` callers (0), repository callers (0). Checkpoint log: `~/workspace/orca-finish/wave1/state-recovery/CHECKPOINT.md`.
