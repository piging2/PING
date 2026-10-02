# LANE D — Completion atomicity, attempt model, effect model, result identity, user-created mission identity

Constitutional convergence audit, read-only lane. Target worktree
`/home/nolan/worktrees/constitutional-convergence-authority-law` on the Pig,
HEAD verified `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` (dirty worktree;
all findings below distinguish HEAD vs worktree explicitly).
All file:line citations are Pig-worktree paths. No Pig state was mutated;
source files were copied byte-verified (sha256) to
`lane-d-execution/pig-src/` for analysis.

Standing law applied: UnifiedEventRuntime = canonical event acceptance
authority; ping_events = journal; ONE DECISION -> ONE OWNER.
Operator correction applied: neither completion ordering is satisfactory;
attempt_id/effect_id absence is concrete, not theoretical.

---

## 1. COMPLETION (Part 6)

### 1.1 The reversal, exactly

File: `ping-runtime/orchestration/mission_runtime.js`, method `complete()`
(HEAD lines 166-189; worktree lines 166-200). Full diff preserved at
`lane-d-execution/mission_runtime.diff.txt`.

HEAD (committed) ordering:

1. `UPDATE ping_missions SET status='completed', result=..., completed_at=NOW()
   WHERE mission_id=$2 AND status='running'` (unconditional on event outcome).
2. `if (rowCount===1 && this._eventRuntime) await emit('MISSION_COMPLETED', ...)`.
   The emit's return value is NEVER inspected.

Worktree (dirty) ordering:

1. `emit('MISSION_COMPLETED','mission-runtime',{missionId,result,duration_ms})`
   FIRST; require `emitted.status==='ok'`; throw otherwise (row stays 'running',
   scheduler retry/fail path takes over).
2. Conditional `UPDATE ... WHERE status='running'`; return rowCount.

Behavioral deltas beyond order: (a) emission rejection now throws instead of
being silently ignored (phantom completion proven by Lane J failure injection,
per the new docstring); (b) `complete()` now returns rowCount to the caller;
(c) the scheduler (`mission_scheduler.js:349`) ignores that return value and
unconditionally counts `stats.completed++`.

### 1.2 HEAD crash windows

W1 (the named defect): UPDATE commits, crash before `emit()` returns or is
accepted. Row reads `completed`; canonical history has no MISSION_COMPLETED.
The result payload survives only in `ping_missions.result` (JSONB): recoverable
by inspection, invisible to replay/reconstruction/consumers. Blast radius today
is bounded because NO live in-memory consumer of MISSION_COMPLETED exists
(verified: only `gateway/generated/event_generator.js:317` references it as a
registry entry; the bridge does not subscribe to it). The loss is
history-integrity, not live behavior. Future consumers would silently miss
completions.

W2: emit rejected/failed (governance/validator/identity/persist) after UPDATE
committed. Same phantom state as W1, reachable without any crash. This is what
Lane J proved by injection.

### 1.3 Worktree crash windows (the operator's objection, made concrete)

W3 (emit accepted, crash before UPDATE commits): row stays `running`. The
scheduler is dead in the crash case, so nothing renews the lease
(`lease_until` was last set at claim, 60s TTL, `mission_runtime.js:108`).
`reapExpiredLeases()` (`mission_runtime.js:309`) resets the row to `created`,
clears `assigned_to`/`claimed_at`/`lease_until`, and emits
MISSION_LEASE_EXPIRED. The next poll re-claims and re-dispatches: the worker
RE-EXECUTES. Re-execution of what is answered in section 3.4; in short, every
canonical worker except witness re-emits downstream events with NEW event_ids
(no `logical_id` passed anywhere on the mission path), so the journal gains
duplicate OBSERVATION_CREATED / CLAIM_CREATED / ... chains. Then `complete()`
runs again: the payload now differs (`duration_ms`, `result.completed_at` are
wall-clock) so UER mints a SECOND, distinct MISSION_COMPLETED event_id and
accepts it too. Net effect of W3: doubled downstream effects, two accepted
completion events, one MISSION_LEASE_EXPIRED noise event. The mission does
eventually read `completed`, but the journal is polluted.

W4 (emit accepted, UPDATE matches 0 rows): the conditional `WHERE
status='running'` loses a race (concurrent `fail`/`failWithRetry`/reap between
emit and UPDATE). The MISSION_COMPLETED event is ACCEPTED and handlers +
integrations have already fired (UER dispatches synchronously inside `emit()`,
`unified_event_runtime.js:285-300`), but the row never transitions. Event/row
divergence in the opposite direction from W1. The scheduler still counts it
completed (`mission_scheduler.js:349-354` ignores the 0).

W5 (visibility inversion): in the worktree ordering, in-memory handlers and
integration routing observe MISSION_COMPLETED BEFORE the row says `completed`.
Any present or future consumer that reads the row on notification sees a stale
state. HEAD had the opposite inversion (row first, event maybe never).

Neither ordering closes the window because the two writes are two separate
auto-commit statements with observable side effects (handler dispatch) between
them. That is the structural fact both orderings share.

### 1.4 Families C-A through C-E: spec and falsification

**C-A: same-Postgres-transaction.**
Spec: `UER.emit()` accepts `options.pgClient`; `MissionRuntime.complete()`
does `client=pool.connect(); BEGIN; emit(...,{pgClient:client});
UPDATE(client) ... WHERE status='running'; COMMIT`. UER still runs
validation, governance, identity minting, and the INSERT itself (on the
provided client): it remains the decider, the transaction is only the
atomicity mechanism, and MissionRuntime never issues a raw INSERT into
ping_events. Handler dispatch (step 7) and integration routing (step 8) MUST
be deferred to a post-commit hook returned by `emit()`; they cannot run
inside the transaction.
Falsification attempts: (i) Naive C-A (just pass the client) is BROKEN:
handlers dispatched inside `emit()` would observe an event the transaction
later rolls back: phantom observation. The post-commit deferral is not
optional. (ii) Acceptance-vs-persistence tension: the caller can ROLLBACK an
event UER already "accepted". Resolution: acceptance inside a caller tx is
provisional until commit; document that `status:'ok'` from a tx-scoped emit
means "accepted into the pending transaction". This is honest and preserves
the authority boundary. (iii) Deadlock/sequence: INSERT uses the `sequence`
DEFAULT (nextval); safe inside tx. Verdict: NOT falsified. Viable, bounded
surgery (one option on `emit()`, one deferred-dispatch hook, one tx in
`complete()`).

**C-B: state transition + outbox with duplicate-emission attack.**
Spec: `complete()` writes row UPDATE + outbox row in one tx; an async relay
calls `UER.emit()` (never raw INSERT) and marks published. Attack the relay:
crash after UER accepts but before mark-published -> re-emit on recovery ->
second acceptance UNLESS the completion event has a stable identity. Today's
`complete()` passes no `logical_id` and the payload contains wall-clock
fields, so identity is unstable: C-B duplicates without the identity fix
from C-E. With the identity fix, C-B works but has converted an atomicity
problem into an idempotency problem plus a new relay component (lag, poison
pills, relay crash loops, ordering vs other events). Prior art exists and is
dead: `gateway/event_outbox.js` (Phase 21, Redis/WebSocket publication, zero
live callers). Verdict: NOT falsified, but strictly more machinery than C-A
for the same guarantee. Justified only if emitter and row-writer must live in
different processes; they do not.

**C-C: event-as-completion-authority.**
Spec: MISSION_COMPLETED acceptance IS the completion; `ping_missions.status`
becomes a projection maintained by a projector. Falsification (practical, not
logical): the scheduler's dispatch decisions read the row
(`getPending`, conditional claim on `status='created'`); making them read a
projection couples every 5s poll to projection lag and availability, and
turns synchronous completion confirmation into an async wait. The claim
atomicity (single conditional UPDATE) would need reimplementation in
event-sourced terms. The task instruction says do not choose casually:
agreed. Verdict: coherent, disproportionate, violates smallest-patch. DECLINED.

**C-D: mission-row-as-authority + derived event.**
Spec: row UPDATE is the completion; a projector derives MISSION_COMPLETED
into the journal. Falsification: (i) it recreates HEAD's window at the
projector (row commits, projector crashes before emit: same phantom);
(ii) the derived event's canonical timestamp is projection time, not
completion time (original time survives only as payload data); (iii) it
inverts the standing law: meaningful state changes must enter canonical
history THROUGH the event authority as accepted decisions, not as derived
shadows. Verdict: FALSIFIED as a solution to the stated problem.

**C-E: reconciliation.**
Spec: deterministic completion-event identity
(`logical_id = {kind:'mission-completion', mission_id}`); a reconciler finds
completed-without-event (regenerate from the row's `result` JSONB) and
event-without-completed-row (transition the row). Falsification of the
premise: does current UER identity give deterministic completion identity?
NO. `complete()` passes no `logical_id`; identity falls back to the full
payload including `duration_ms` and `result.completed_at` (wall clock), so
every emit mints a new event_id. C-E is unimplementable without the identity
patch. Further: reconciliation is eventually consistent (readers see the
divergence inside the window); regenerated events carry reconcile-time
timestamps (original `completed_at` preserved in payload). Verdict: NOT
falsified, but it is a second layer, not the primary close.

### 1.6 Recommendation and smallest patch

Primary: **C-A** (shared transaction + post-commit handler dispatch) with the
**deterministic completion identity** from C-E as a required companion
(`logical_id` on the MISSION_COMPLETED emit also makes `complete()` safely
retryable: a retried emit after W3 dedups via ON CONFLICT instead of minting
a second event). C-E's reconciler follows as defense-in-depth, not as the
fix. C-D is falsified; C-C declined as disproportionate; C-B kept in reserve
for a future multi-process topology.

Smallest patch closing the invariant (no phantom completion AND no
unbounded re-execution):
1. `unified_event_runtime.js`: `emit()` accepts `options.pgClient`
   (`const db = options.pgClient || this._pool`, two query sites); when a
   client is supplied, handler/integration dispatch is returned as a
   post-commit callback instead of running inline; document provisional
   acceptance.
2. `mission_runtime.js` `complete()`: acquire client, BEGIN, tx-scoped emit
   with `logical_id:{kind:'mission-completion',mission_id:missionId}`,
   conditional UPDATE on the same client, COMMIT, then run the post-commit
   dispatch; on any failure ROLLBACK and throw (row stays `running`, existing
   retry path handles it).
3. `mission_scheduler.js:349`: honor `complete()`'s rowCount (0 means lost
   the race: do not count `stats.completed++`, do not treat as success).

---

## 2. ATTEMPT (Part 7)

### 2.1 Lifecycle trace (file:line)

All in `ping-runtime/orchestration/mission_scheduler.js` (S) and
`ping-runtime/orchestration/mission_runtime.js` (R), HEAD paths:

- Poll: S:146 `_poll()` -> Arrow 0 renews leases for `_processing` set
  (S:162 -> R:286 `renewLease`, extends `lease_until`, only for
  `status IN ('running','assigned')`); Arrow 1 reaps expired leases
  (S:175 -> R:309 `reapExpiredLeases`: orphans -> `created`, clears
  `assigned_to`/`claimed_at`/`lease_until`, sets `retry_at=NOW()`, emits
  MISSION_LEASE_EXPIRED); Arrow 1b reclaims due retries (S:187 -> R:346
  `reclaimRetryPending`: `retry_pending` -> `created`).
- Claim: S:257 `_processing.add`, S:265 -> R:106 `assign()`: ONE conditional
  UPDATE (R:108) `status='created'` -> `'assigned'`, sets `claimed_at=NOW()`,
  `lease_until=NOW()+60s`, `RETURNING mission_id`. rowCount 1 = won; 0 = lost
  (O4: loser stands down, S:266-268). Emits MISSION_ASSIGNED (no logical_id).
- Start: S:274 -> R:134 `start()`: `'assigned'` -> `'running'`, owner-checked
  (`assigned_to=$2`). Emits MISSION_STARTED (no logical_id).
- Dispatch: event envelope built S:282-307 (dispatched on
  `payload.event_type`, NOT `mission_type`; W-1A consistency guard S:310-321
  fails the mission without dispatch on mismatch) -> S:331
  `_dispatchWithTimeout(event)` (S:220): `Promise.race(dispatch, timeout)` with
  default `dispatchTimeoutMs=300000` (S:101). The LOSING worker promise is
  left to settle on its own (S:226-230).
- Worker execution: `ping-runtime/workers/worker_runtime.js:95` `dispatch()`:
  loops over ALL registered workers whose `eventTypes` include the event_type
  and calls each `handle(event)` (maxConcurrent gate per worker); returns the
  LAST result. Note: one dispatch can execute MULTIPLE workers; only the last
  result is observed.
- Outcomes (S:336-354): `status==='failed'` -> `_failMission`; null/undefined
  -> `_failMission('no worker matched')` (phantom-complete prevention);
  else -> R:166 `complete(missionId, {worker: workerName, completed_at})`.
  **The worker's actual `dispatchResult` payload is DISCARDED here**; the
  completion carries only the scheduler's own worker label plus a timestamp.
- Fail: S:370 `_failMission` -> R:234 `failWithRetry()`: SELECT-then-UPDATE
  read-modify-write on `retries` (not atomic); `nextRetry>=max_attempts`
  -> `failed`, else `retry_pending` + `retry_at`; emits MISSION_FAILED.

### 2.2 Can two physical executions of one mission currently be distinguished?

NO, not as first-class records. What exists:

- Row `ping_missions`: `retries` (failure count, NOT attempt count),
  `claimed_at`/`started_at` (OVERWRITTEN on every claim/start; only the
  latest survives), `assigned_to` (cleared on reap), no `finished_at`, no
  attempt log, no attempt counter.
- Events: MISSION_ASSIGNED / MISSION_STARTED are emitted per claim/start
  without `logical_id`, so re-claims mint distinct event_ids correlatable only
  by `mission_id` + timestamp ordering: an implicit, forensic sequence, not
  an identity.
- The `_processing` set is per-scheduler-process memory; two scheduler
  processes share only the DB.

Two schedulers racing `assign()` are safe (conditional UPDATE, one winner),
but the LOSER leaves no trace and the WINNER's claim is indistinguishable
from any prior claim of the same mission. A lease-reaped re-execution and a
timeout retry are indistinguishable from the first execution on every durable
surface except event-timestamp forensics.

### 2.3 Evidence lost (concrete, not theoretical)

1. Per-attempt start/finish times: only the latest `claimed_at`/`started_at`
   survive; `finished_at` does not exist. An orphaned attempt's timing is
   unrecoverable.
2. Attempt outcome taxonomy: timeout (watchdog fired, S:220) vs orphan
   (lease reaped, R:309) vs failure are indistinguishable on the row; only
   `retries` increments, and the timeout path and the failure path both funnel
   into `failWithRetry`.
3. Which physical execution produced which worker output: the output is
   discarded at S:349-353, so even the surviving completion cannot be
   attributed to an execution, let alone a specific attempt.
4. Worker identity: the completion's `worker` field is the SCHEDULER's label
   (`MISSION_WORKER_MAP`), self-asserted, never confirmed by the worker.
5. Concurrent-dispatch multiplicity: `WorkerRuntime.dispatch` can run several
   workers per event (worker_runtime.js:103-131) but only the last result
   surfaces; the others' executions are invisible.

### 2.4 Minimal attempt record (every field challenged)

Table `ping_mission_attempts`, owned by MissionRuntime (operational record;
the MISSION_* events remain the audit trail, with MISSION_ASSIGNED enriched
by `attempt_number`):

- `attempt_id` TEXT PK: `sha256('mission-attempt:'+mission_id+':'+attempt_number)`
  hex. Deterministic: a retried claim for the same number dedups instead of
  forking. CHALLENGE (random UUID?): rejected; determinism is what makes
  crash-recovery rediscover rather than duplicate. KEEP.
- `mission_id` TEXT NOT NULL (index). KEEP: the join key.
- `attempt_number` INTEGER NOT NULL: incremented ATOMICALLY inside the claim
  UPDATE (`SET attempt=COALESCE(attempt,0)+1 ... RETURNING attempt`; add the
  column to `ping_missions`). CHALLENGE (derive as retries+1?): rejected;
  `retries` counts failures, attempts count claims; an orphaned claim that
  never failed would be invisible. KEEP as its own counter.
- `worker` TEXT: `assigned_to` at claim time. CHALLENGE (row already has
  `assigned_to`?): the row's is cleared on reap (R:309-330); history needs it
  per attempt. KEEP.
- `claimed_at`, `started_at` TIMESTAMPTZ: per-attempt copies. CHALLENGE (row
  has them?): overwritten per claim; per-attempt values are the evidence.
  KEEP.
- `finished_at` TIMESTAMPTZ NULL: set on terminal transition. Does not exist
  anywhere today; without it, attempt duration and orphan detection are
  impossible. KEEP.
- `status`: `claimed | running | completed | failed | timed_out | orphaned`.
  CHALLENGE (fewer states?): `timed_out` (watchdog fired, outcome unknown but
  the attempt is known-dead to the scheduler) vs `orphaned` (lease reaped,
  scheduler never observed an outcome) carry different evidence and different
  follow-ups; collapsing them loses the timeout!=failure distinction the
  operator requires. `claimed` vs `running` distinguishes crash-before-start.
  Six states is the minimum honest set. KEEP.
- `result_event_id` TEXT NULL: the MISSION_COMPLETED / MISSION_FAILED /
  WORKER_COMPLETED event_id produced for this attempt. CHALLENGE (events
  carry mission_id, joinable?): re-execution can produce MULTIPLE completion
  events (W3 in section 1.3); the binding disambiguates which attempt each
  completion belongs to. KEEP.

The attempt INSERT shares the claim's transaction (same C-A mechanism as
section 1.6); a crash after claim leaves a `claimed` row: honest orphan
evidence, not a leak.

### 2.5 Attack analysis

- Two schedulers claim simultaneously: the conditional UPDATE admits exactly
  one winner; the increment rides in the same UPDATE so the winner's
  `attempt_number` is atomic. Loser stands down (S:266-268), emits nothing,
  records nothing. SAFE.
- Crash after increment: increment is inside the claim UPDATE and the attempt
  row is inserted in the same tx: the record exists with status `claimed` and
  no `started_at`. A later reconciler marks it `orphaned` if the mission is
  re-claimed. Evidence preserved, no phantom execution claimed. SAFE.
- Crash before execution: identical to crash-after-increment (execution never
  began). The `claimed`-without-`running` state is precisely the
  distinguishing evidence. SAFE.
- Lease recovery: reaper resets the row to `created` (R:309-330); the
  in-flight attempt row stays `running` with no `finished_at`. On re-claim the
  new attempt gets `attempt_number+1`; a sweeper marks the superseded
  `running` attempt `orphaned`. The two physical executions are now
  distinguishable by `attempt_id`. SAFE, provided the sweeper exists.
- Retry after unknown outcome (the sharpest): dispatch hits the 300s watchdog
  (S:220-238) -> `failWithRetry` -> `retry_pending` -> reclaim -> new claim ->
  new attempt, WHILE the first worker promise may still be running (S:226-230
  leaves it to settle). Its late return value is dropped, but its emitted
  downstream events persist. Attempt N records `timed_out`; attempt N+1
  records `completed`; the journal shows both attempts' downstream events.
  This is the exact evidence the effect ledger (section 3.5) needs to reason
  about duplicate effects. The attempt record does not PREVENT the duplicate;
  it makes it VISIBLE and attributable, which is the precondition for any
  compensation policy. HONEST-BUT-INCOMPLETE without section 3.5's gate.

### 2.6 Test specs

1. Double-claim race: two scheduler instances, one `created` mission ->
   exactly one `assign()` returns 1; `attempt_number`s are unique and
   sequential; loser dispatches nothing (assert via dispatch spy).
2. Crash-after-claim: stub the worker to throw between `assign` and `start`
   (kill the dispatch path) -> attempt row `claimed`, no `started_at`; run
   reaper past lease TTL -> attempt marked `orphaned`; mission re-claimable
   with `attempt_number+1`.
3. Watchdog timeout: worker sleeps past a short `dispatchTimeoutMs` -> attempt
   N `timed_out`, mission `retry_pending`; reclaim, re-dispatch with fast
   worker -> attempt N+1 `completed`; assert both attempt rows exist and the
   timed-out attempt's downstream events (if any) are attributable to N.
4. Lease-expiry re-execution: claim, stop renewals, advance clock past 60s,
   run `reapExpiredLeases` -> row `created`, attempt `running`->`orphaned` by
   sweeper; re-claim -> new `attempt_number`; assert old attempt row intact.
5. Completion idempotency: `complete()` twice for one mission with the
   deterministic completion identity (section 1.6) -> second UPDATE rowCount
   0, second emit dedups (ON CONFLICT, `deduplicated:true`), exactly one
   MISSION_COMPLETED row.
6. Multi-worker dispatch: register two workers for one event_type, dispatch
   once -> assert both `handle()` ran but only one attempt outcome recorded
   (documents the multiplicity in 2.3.5; fails until dispatch is
   one-worker-per-mission or multi-results are recorded).

### 2.7 Smallest patch

1. `ALTER TABLE ping_missions ADD COLUMN attempt INTEGER DEFAULT 0`; new
   table `ping_mission_attempts` with the eight columns above.
2. `assign()`: `SET attempt=COALESCE(attempt,0)+1 ... RETURNING attempt`;
   insert the attempt row in the same tx; include `attempt_number` in the
   MISSION_ASSIGNED payload.
3. `start()` / `complete()` / `failWithRetry()` / timeout path / reaper
   sweeper: transition the CURRENT attempt's `status` and set `finished_at`,
   `result_event_id` where applicable.
4. Scheduler honors `complete()` rowCount (section 1.6.3).

---

## 3. EFFECT (Part 8)

### 3.1 Reachability method

Enumerated every registered worker on the live mission path
(`registerCanonicalWorkers`, `canonical_workers.js:920-1010`, dispatched via
`MissionScheduler._dispatch` -> `WorkerRuntime.dispatch`), every connector in
`ping-runtime/connectors/`, and every `fetch`/SMTP/Twilio/GitHub/CRM/filesystem/
shell call site. A component is CONSEQUENTIAL only if it is reachable from
mission dispatch; present-but-unreachable components are classified
separately so a future wiring cannot silently inherit a clean bill.

### 3.2 Classification table (live mission path)

| Component | Effect | Class | Provider idem. key? | PING provides one? | Outcome queryable? | Duplicate detectable? | Reversible? | On timeout |
|---|---|---|---|---|---|---|---|---|
| ObservationWorker | emits OBSERVATION_CREATED via UER | CANONICAL DB ONLY | n/a (UER dedups by event_id) | NO: no `logical_id` passed, identity falls back to payload incl. wall-clock `timestamp` | yes (journal) | NO: re-execution mints a new event_id, both accepted | n/a (history append) | n/a |
| ClaimWorker | emits CLAIM_CREATED | CANONICAL DB ONLY | n/a | NO (same as above) | yes | NO (same) | n/a | n/a |
| ClassificationWorker | emits CLASSIFICATION_CREATED | CANONICAL DB ONLY | n/a | NO (same) | yes | NO (same) | n/a | n/a |
| RecommendationWorker | emits RECOMMENDATION_CREATED | CANONICAL DB ONLY | n/a | NO (same) | yes | NO (same) | n/a | n/a |
| LineageWorker | emits LINEAGE_CREATED | CANONICAL DB ONLY | n/a | NO (same) | yes | NO (same) | n/a | n/a |
| ReplayWorker | emits REPLAY_COMPLETED; optional in-process kernel replay | CANONICAL DB ONLY (+ PURE compute) | n/a | NO (same) | yes | NO (same) | n/a | n/a |
| ProjectionWorker | emits PROJECTION_CREATED, then Qdrant upsert (`embedding_service.js:214-230`, point id `toQdrantId(event.event_id)`, deterministic) | IDEMPOTENT PROJECTION | YES: Qdrant upsert by point id is inherently idempotent | YES: deterministic point id | yes (point id = f(event_id), re-readable) | YES (same point id overwritten) | YES (delete point by id) | Qdrant failure SWALLOWED (returns ok anyway): event accepted, projection missing (derived gap, fail-open on projection only) |
| WitnessWorker | emits WITNESS_CREATED / WITNESS_REJECTED with `logical_id` (kind + replay_event_id + witness_root, `canonical_workers.js:640-648`) | CANONICAL DB ONLY, retry-safe | n/a (UER dedups by event_id) | YES: logical_id; retry mints the SAME event_id, ON CONFLICT dedups | yes | YES (deduplicated:true) | n/a | n/a |
| EmbeddingService.embed | Ollama `/api/embeddings` (`ollama_provider_adapter.js:39`) | PURE (compute, no external mutation) | n/a | n/a | n/a | n/a (see note) | n/a | unknown: no timeout verified on this call path |
| KnowledgePromoter (optional; only when knowledgeGraph wired) | promotes candidate node to approved (confidence 1.0) | UNKNOWN (not inspected; internal store mutation, likely IDEMPOTENT PROJECTION if the graph store upserts) | unknown | unknown | unknown | unknown | unknown | unknown |
| IntelligenceWorker | dormant (`eventTypes:[]`, never registered) | unreachable | - | - | - | - | - | - |

Note on embedding nondeterminism: re-projection upserts the SAME point id, so
no duplicate points ever exist; but the vector bytes may differ slightly
across runs if the embedding model is nondeterministic. The point PAYLOAD
carries `source_event_id`, so provenance survives the rewrite.

### 3.3 Present but NOT on the live mission path (no registered worker calls them)

| Component | Status | Class today |
|---|---|---|
| EmailConnector / EmailIntegration (`connectors/email_integration.js:2`: "Stub for email delivery: not functional until SMTP provider configured") | STUB; `send()` exists but no SMTP transport; zero callers outside the module | no live effect |
| SmsIntegration (`connectors/sms_integration.js:14` `send()`) | provider string `'twilio'` only; no Twilio API call found; zero callers | no live effect |
| GitHub connectors/adapters | discovery metadata only; no API calls | no live effect |
| Google connector / CustomerAuthority (`business/customer_authority.js`) | Gmail/People/Calendar READS (`executeFetchContacts`, `executeFetchThreadsByEmail`) + local DB updates + `_emitEvent`; `executeSyncCustomerEmail` is read-then-local-write, NOT a send | PURE reads + internal writes; unreachable from mission dispatch |
| PostHog connectors | no HTTP calls; discovery only | no live effect |
| OAuthProvider | `fetch` to tokenUrl/revokeUrl (credential-flow effects) | consequential in principle; unreachable from mission dispatch |
| Shell/git/docker (`gateway/*`, `orchestration/execution/*`) | real process execution | consequential; unreachable from mission dispatch |

### 3.4 What re-execution MEANS on the live path (the operator's question)

Today, re-executing a mission (lease-expiry reclaim, watchdog-timeout retry,
or the worktree W3 window) means:

1. The pure workers re-emit their downstream events with NEW event_ids. The
   journal accepts both copies. Downstream fan-out MULTIPLIES the duplication:
   a duplicated OBSERVATION_CREATED spawns a duplicated claim, classification,
   recommendation, projection event, and Qdrant re-upsert. The ONLY worker
   immune by construction is WitnessWorker (logical_id dedup).
2. ProjectionWorker's Qdrant write is idempotent (same point id), so the
   projection converges; but PROJECTION_CREATED itself duplicates, so replay
   and downstream consumers re-process.
3. NO irreversible external effect is reachable today: email/SMS are stubs,
   and no worker performs CRM mutation, publishing, deployment, or shell
   execution. The blast radius of re-execution is journal pollution +
   wasted compute, not customer-facing damage.
4. The timeout path (`mission_scheduler.js:220-238`) is the sharpest live
   risk: the orphaned worker promise keeps running after the watchdog fires,
   its events persist, and the retry re-executes. Timeout != failure is not
   a theoretical nicety here; it is the normal shape of the duplicate.

The architectural consequence: the code paths that WOULD double-send an
email the day a sending worker is registered are the SAME paths that today
double-emit observations. Re-execution safety must be built as if effects
were irreversible, because the wiring that makes them irreversible is one
`register()` call away.

### 3.5 Effect ledger: is it justified?

NOT justified as a build today: there is no consequential external effect on
the live path, so a ledger would be machinery without a user (and PING's own
rule: infrastructure needs a proven business need). What IS justified today:
(a) the attempt record from section 2, which captures UNKNOWN_OUTCOME for
timeouts/orphans: the evidence any future ledger would join on; (b) a
standing GATE RULE, so the first effectful worker cannot be wired without
the ledger.

Challenging the candidate states
(PREPARED/AUTHORIZED/DISPATCHING/UNKNOWN_OUTCOME/CONFIRMED/FAILED/REJECTED/
COMPENSATED): PREPARED is indistinguishable from AUTHORIZED without a
two-phase provider: drop it. REJECTED is authorization's negative, not an
effect state: drop it (it belongs on the work-order decision). DISPATCHING
names an unobservable instant; what matters is outcome knowledge: fold into
DISPATCHED. COMPENSATED survives ONLY per effect-type (compensation is not a
universal operation). Minimal honest set:

`AUTHORIZED -> DISPATCHED -> CONFIRMED | FAILED | UNKNOWN_OUTCOME`,
with `COMPENSATED` as an optional terminal transition where the effect type
supports reversal.

Ledger rules (for the day the gate trips):
- The ledger row is written BEFORE the provider call, keyed by
  `effect_id = sha256('effect:'+attempt_id+':'+effect_seq)` (deterministic;
  a retried dispatch with the same key returns the recorded outcome instead
  of re-calling the provider).
- The provider MUST be called with its native idempotency key set to
  `effect_id` where the provider supports one (Stripe-style, SES
  configuration-set, Twilio? verify per provider at wiring time).
- Timeout NEVER resolves to FAILED: the row stays UNKNOWN_OUTCOME until a
  queryable provider confirms or denies, or a bounded reconciliation marks
  it (still UNKNOWN_OUTCOME with `reconciled:true`, never rewritten as
  FAILED: evidence of ignorance must not become evidence of failure).
- Duplicate detection: query provider by idempotency key before re-dispatch.
- Gate rule (effective immediately): no worker performing a
  REVERSIBLE/IRREVERSIBLE external effect may be registered until it goes
  through authorize -> ledger -> dispatch -> confirm, and its classification
  row is added to section 3.2's table.

### 3.6 Smallest patch

1. Attempt record from 2.7 (carries UNKNOWN_OUTCOME; the ledger's future
   join key).
2. `ProjectionWorker`: pass `logical_id` on PROJECTION_CREATED
   (it already has a natural one: the projected event's id) so projection
   re-execution dedups like witness does. One-line class upgrade from
   "duplicates" to "retry-safe" for the only external writer on the path.
3. Record the gate rule in the worker registration contract
   (`registerCanonicalWorkers` docstring): effectful workers require the
   ledger; no ledger is built until the first such worker exists.

---

## 4. RESULT (Part 14)

### 4.1 Findings

Two parallel realities exist.

Reality A: `ping-runtime/external-agent/external_agent_adapter.js` (488
lines) implements a complete result-identity scheme, but has ZERO production
callers (verified: no `require` of `issueWorkOrder`/`recordVerifiedResult`/
`authorizeWorkOrder` outside its own module and its test):
- `workOrderId(taskId) = sha256('workorder:'+taskId).slice(0,16)`
  (`external_agent_adapter.js:245`); `stableWorkOrderId` lets a restart
  rediscover the same id instead of minting a run-scoped one (236).
- `issueWorkOrder` (300-340) builds the authorization: work_order_id,
  agent_id, mission_id, task_id, correlation_id, context_pack_id,
  causation_id, `attempt` (caller-supplied positive int, validated),
  namespace, capability, input, constraints, result_path, deadline.
- `resultIdentity(result, workOrder)` (357-366):
  `sha256('external-result:'+stableStringify({work_order_id, mission_id,
  task_id, attempt, agent_id, capability, context_pack_id, namespace}))`.
  NOTE: the binding covers the AUTHORIZATION context only; `output`,
  `evidence`, and `error` are NOT in the hash.
- `verifyResultEnvelope` (374-420): envelope-vs-work-order checks:
  work_order_id match, context_pack_id match, executor triple-match
  (`workOrder.agent_id === invokedAgentId === result.agent_id`), capability
  match, status in {completed, failed}, output/error consistency rules,
  deadline enforcement.
- `recordVerifiedResult` (431-470): on valid envelope, emits
  WORKER_COMPLETED/WORKER_FAILED via `eventRuntime.emit` with
  `logical_id = result_id`: a retried record dedups via ON CONFLICT.

Reality B: the live mission path uses NONE of it. `MissionScheduler._dispatch`
(S:349-353) calls `complete(missionId, {worker: workerName, completed_at})`
and DISCARDS `dispatchResult`. The MISSION_COMPLETED event therefore carries
scheduler-asserted metadata (its own worker label, a timestamp), not the
worker's output, not an envelope, not a verification. `business_emitters.js:93-96`
emits WORKER_COMPLETED/WORKER_FAILED with `{worker, mission_id, result}` and
is required by gateway bootstrap, but nothing on the mission dispatch path
invokes it per completion.

### 4.2 The five questions, answered

1. Can one attempt produce multiple result records? On the mission path an
   attempt produces ZERO result records (output discarded). In Reality A,
   `logical_id=result_id` dedups exact replays; BUT because `output` is not
   in the identity hash, two DIFFERENT outputs for the same (work_order,
   attempt) mint the SAME result_id: the second is silently treated as a
   duplicate. Separately, `WorkerRuntime.dispatch` (`worker_runtime.js:103-131`)
   can execute MULTIPLE workers for one event and surfaces only the last
   result: multiple executions, one recorded outcome, by construction.
2. Can retry overwrite a result? Mission path: `ping_missions.result` is
   overwritten by any later `complete()` whose conditional UPDATE matches
   (re-execution after lease reclaim re-enters `running`); no result history
   exists. Reality A: same result_id dedups (no overwrite); a new attempt
   mints a new result_id (no overwrite, but also no supersedes-link between
   the two records).
3. Can two different results claim the same logical attempt? YES, concretely:
   the resultIdentity collision in (1). "Logical attempt" does not exist as an
   identity on the mission path at all, so the question is unanswerable there:
   worse than yes.
4. Can mission completion carry an unauthenticated worker result? YES, and it
   is the CURRENT state: MISSION_COMPLETED carries no worker result at all,
   only scheduler-asserted `{worker, completed_at}`. The worker name is
   asserted by the scheduler, never confirmed by the worker. There is no
   envelope, no signature, no work-order binding on the mission path. (Reality
   A's `verifyResultEnvelope` is the authentication machinery; it is unwired.)
5. Does result identity bind mission, attempt, work order, worker, context
   pack, output, execution version? Reality A binds mission_id, task_id,
   attempt, work_order_id, agent_id, capability, context_pack_id, namespace:
   YES to the authorization half; NO to `output`/`evidence` (not hashed) and
   NO to execution version (no code/worker version anywhere in the binding).
   Mission path: binds nothing.

### 4.3 RESULT axioms (challenged, then stated)

- RSLT1 (challenged): "every accepted result binds exactly one authorized
  work execution". On the mission path there IS no authorization artifact, so
  the axiom as stated would outlaw the entire current completion flow rather
  than describe it. Scope it: where a work-order authority exists, the result
  MUST bind it; where none exists, the completion MUST be labeled unattested
  (see patch 2). And "binds the execution" is false if the binding omits the
  output: identity over authorization-context alone identifies the PERMISSION,
  not the RESULT.
- RSLT1 (stated): Every accepted result binds exactly one authorized
  (mission, attempt); the binding MUST include a hash of the canonical output
  (output + evidence + error), or it does not identify a result.
- RSLT2 (stated): Same result identity + different canonical result bytes =
  a COLLISION. It must be rejected loudly (or recorded as a distinct
  superseding record), never silently deduped. Current `resultIdentity`
  violates this by excluding output from the hash.
- RSLT3 (stated): MISSION_COMPLETED cannot be stronger than result
  verification. Today it is strictly weaker (it carries no verified result),
  which satisfies the letter of RSLT3 while being useless: any consumer
  reading `MISSION_COMPLETED.result` as "the worker's output" is misreading
  scheduler metadata. The event must either carry the verified envelope or
  carry an explicit `attested:false`.

### 4.4 Smallest patch

1. Include `sha256(stableStringify({output, evidence, error}))` in the
   `resultIdentity` binding (closes the RSLT2 collision; one-line hash
   change, additive: keep the old field for forensics, do not rewrite).
2. Stop discarding `dispatchResult` (S:349): pass it through `complete()` as
   `unattested_result`, and mark the MISSION_COMPLETED payload
   `result_attested:false` until Reality A is wired in. Honest labeling beats
   silent metadata.
3. Add worker/execution version to the work-order binding when Reality A is
   wired (execution version is currently bound nowhere).
4. Do NOT merge Reality A into the mission path until the attempt record
   (section 2) exists: the work order's `attempt` field is caller-supplied
   today and needs the atomic attempt counter as its source.

---

## 5. USER-IDENTITY (Part 5)

### 5.1 The fallback (file:line)

`ping-runtime/orchestration/mission_runtime.js:71-76` (`create()`):

```js
const idempotencyKey = payload.event_id
  ? `${missionType}:${payload.event_id}`
  : `${missionType}:${JSON.stringify(payload)}`;
const missionId = sha256(idempotencyKey).digest('hex').slice(0,16);
// INSERT ... ON CONFLICT (mission_id) DO NOTHING
```

The HTTP entry is `POST /missions` (`gateway/routes/missions.js:51-66`):
Bearer <redacted> (`PING_MISSION_API_TOKEN`; 503 fail-closed when unconfigured),
body `{missionType, payload, priority, createdBy}`. No idempotency-key
support anywhere on the route.

### 5.2 What makes two HTTP requests the SAME logical request?

Today: nothing in the protocol can say so. Sameness is inferred post-hoc
from payload bytes, with three failure modes: (a) byte-identical bodies ->
same mission_id -> second request is a SILENT no-op returning 200 with the
same missionId (the caller cannot tell it was a dedup); (b) semantically
identical bodies with different key order -> different `JSON.stringify`
output -> different mission_id -> DUPLICATE missions and duplicate work;
(c) same intent retried with any volatile field (client timestamp, request
nonce inside payload) -> different mission. The system cannot distinguish
"client retry" from "coincidence", and its two failure modes point in
opposite directions (lost work vs duplicated work).

### 5.3 Three contracts

**U1: explicit Idempotency-Key header.** Server stores
`key -> {mission_id, request_hash, created_at}` with a TTL (e.g. 24h), scoped
by the API token. Same key + equivalent body -> 200 with the SAME missionId
(and a `Idempotent-Replayed: true` marker so the caller can tell). Same key +
DIFFERENT body -> 409 Conflict (the key is bound to the first request's
hash). No key -> ALWAYS create a new mission (explicitly non-idempotent;
documented). Equivalence = hash of canonicalized body. Key lifecycle: TTL
expiry is documented; reusing an expired key starts a new chain.

**U2: server command receipt.** POST returns a `command_id` receipt
immediately; the mission attaches to it; client retries present the
`command_id`. Two-phase for a synchronous create: the receipt duplicates
`missionId`'s role without adding information, and "same logical request"
is still answered by "same command_id", which the CLIENT must store: the
deduplication burden moves but does not shrink. Fits async/long-running
flows; over-engineering for a create that already returns its id.

**U3: content-addressed mission (canonicalized).** Keep hash identity but fix
the hash: stable stringify (sorted keys), strip a declared volatile-field
allowlist per mission type, schema-version the canonicalization. Same
canonical content -> same mission, deterministically, with no protocol
change.

### 5.4 Which fits PING

PING's philosophy is deterministic identity from logical content (event
identity, `logical_id`, `work_order_id`, the bridge's `event_id` branch of
`create()`). U3 is the philosophy applied naively, and it fails at the USER
boundary for one reason: at that boundary, intent and content are different
things. A client retry and a coincidental duplicate have identical content
and opposite correct handling (dedup vs new work); no content function can
separate them. U1 separates them with the client's explicit word, it is the
IETF-standard HTTP mechanism, and its failure modes are explicit (409 on
key/body mismatch, TTL documented). U2 adds a phase without adding an
answer. Recommendation: **U1 for the user-facing route; keep U3 (the
`event_id` branch, already correct: the event IS the identity authority)
for bridge-created missions.** Do NOT just replace `JSON.stringify` with
canonical JSON: that fixes key order while preserving the
intent/coincidence confusion and the volatile-field problem, i.e. it makes
the wrong answer deterministic.

### 5.5 Smallest patch

1. `POST /missions`: accept `Idempotency-Key` header; key store table
   `mission_idempotency_keys(key TEXT PK, mission_id TEXT, request_hash TEXT,
   created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)`; implement U1 semantics
   (200+replay marker / 409 / always-new-without-key).
2. Deprecate the raw `JSON.stringify(payload)` fallback: without a key and
   without `event_id`, require explicit `?fresh=true` OR reject with 400
   pointing at the key. The silent accidental dedup must become a loud
   client choice.
3. Leave the `event_id` branch untouched: it is the correct content-addressed
   path (bridge missions).

---

## 6. Cross-lane notes

- The deterministic completion identity (1.6, `logical_id` on
  MISSION_COMPLETED) is load-bearing for THREE lanes' fixes: completion
  atomicity retries, the attempt record's `result_event_id` binding, and the
  outbox/relay family. It should be built once, first.
- `WorkerRuntime.dispatch` executing multiple workers per event
  (`worker_runtime.js:103-131`) with only the last result surfacing interacts
  with RESULT axioms: on the mission path each mission names ONE worker, but
  the dispatch primitive itself is fan-out. If fan-out is ever used
  deliberately, one attempt -> N results needs the multi-result rule from
  4.2.1 decided, not discovered.
- Open question for the parent: whether `MISSION_COMPLETED.result` consumers
  exist downstream of the gateway (Lane G's graph projection now ingests
  WORKER_COMPLETED/WORKER_FAILED as knowledge candidates per the worktree
  diff; MISSION_COMPLETED is not yet in that set). The RSLT3 honest-labeling
  patch should land before any consumer is added.
- Files produced: `mission_runtime.diff.txt` (the characterized reversal),
  `pig-src/` (5 byte-verified source files), `pig-files.b64` /
  `pig-files.tar.gz` / `checksums.txt` (transfer artifacts).
