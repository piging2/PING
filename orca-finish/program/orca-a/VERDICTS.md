# ORCA-A Verdicts — identity / claiming / leases / fencing

Lane: ORCA FINISH PROGRAM, ORCA-A. Date: 2026-09-23 ~20:05-21:00 MDT.
Operator: subagent (depth 2/2), NIGHT SHIFT rules in force.

Targets (all read-only; Pig reads via pigwsl-run.sh, source copies under
`src/` are read-only reference copies for probes):
- A5 branch worktree /home/nolan/worktrees/orca-autonomy @ ae55b77ff82a893d50c48ab299117b2f705a0f03:
  orca/control-loop/objective-runtime.js, orca_control_loop.js, policy/
- W2-IMPL-STATE /home/nolan/ping-orca-state @ 30a750fad (branch orca-finish/state):
  orca/control-loop/orca_run_record.js (fencing-epoch CAS, 7-state table), orca_ready_set.js
- Mainline /home/nolan/ping @ cc6856c3b (branch refactor/runtime-authority-convergence):
  ping-runtime/orchestration/mission_runtime.js, mission_scheduler.js

Prior evidence challenged, not re-proven: C1 A5 verdict, C2 spine gaps GAPS.md.
GAP 1 (no Run entity), GAP 3 (bare retries counter), GAP 5 (stuck-worker lease
hole) all re-confirmed against current source; none have been fixed since.

Probes: ~/workspace/orca-finish/program/orca-a/probe.js (43 checks) and
probe2.js (14 checks), all against scratch temp dirs only. 57/57 PASS.

Verdict counts: ORCA STRONGER->HARVEST: 4 | PING STRONGER: 2 | EQUIVALENT: 2 |
NOT APPLICABLE: 1 | UNKNOWN->INVESTIGATE: 1 | PATTERN ONLY: 0 | REJECT: 0.

---

## Record 1 — mission identity

DOMAIN: identity
COMPONENT: mission identity derivation
CLAIM: ORCA's content-addressed identity (key-order-stable canonical JSON,
full 64-hex) is strictly stronger than PING's truncated event-keyed hash.
EVIDENCE: TEST (probe H1a-H1k) + STATIC (mission_runtime.js:79-90, objective-runtime.js stableStringify)
CALLER: orca deriveObjectiveId / deriveWorkOrderId; PING MissionRuntime.create
CALLEE: crypto sha256; PING: ON CONFLICT DO NOTHING on ping_missions
WRITER: n/a (pure derivation)
READER: scheduler, bridge, run record
AUTHORITY: derivation function (deterministic, no registry)
CLASSIFICATION: ORCA STRONGER->HARVEST
CONFIDENCE: 0.95
BROKEN BOUNDARY: none
DEPENDENCIES: none (pure)
AFFECTS AGENTS: bridge, scheduler, any consumer of mission_id

Evidence detail:
- PING: mission_id = sha256(missionType:event_id or payload)[:16], idempotent via
  ON CONFLICT DO NOTHING (TEST H1h). But when payload has no event_id, the key is
  JSON.stringify(payload), which is NOT key-order stable: {a:1,b:2} and {b:2,a:1}
  produce different mission ids (TEST H1j). Same logical payload can mint two missions.
- ORCA: deriveObjectiveId uses stableStringify (sorted keys, explicit types,
  rejects non-finite numbers) over {namespace, objective_text, constraints};
  deriveWorkOrderId = sha256('work-order:' + objective_id + ':' + task_key),
  full 64-hex, deterministic across restarts (TEST H1a-H1e, H1k).
- PING's 16-hex truncation keeps 64 bits; fine for now, but key-order instability
  is a real duplicate-mission bug class.

---

## Record 2 — run identity

DOMAIN: identity
COMPONENT: run entity and run lifecycle
CLAIM: PING has no Run entity at all (confirmed GAP 1); ORCA adds a durable,
deterministically-identified run record with a 7-state lifecycle. ORCA stronger.
EVIDENCE: TEST (probe H1g, H5a-H5h) + STATIC (orca_run_record.js; mission_runtime.js
has zero run constructs)
CALLER: coordinator (run registration at startup)
CALLEE: objective-runtime atomicWrite/readJson substrate
WRITER: orca_run_record.registerRun / transitionRun
READER: reconcileStartup, assess/close, future schedulers
AUTHORITY: run record file under objectives/<oid>/runs/<run_id>.json (new authority;
no competing run store)
CLASSIFICATION: ORCA STRONGER->HARVEST
CONFIDENCE: 0.9
BROKEN BOUNDARY: none (new file, branch read-only for W2 lane)
DEPENDENCIES: objective-runtime.js substrate (atomicWrite, readJson, objectiveDir)
AFFECTS AGENTS: coordinator, reconciler, assessor

Evidence detail:
- PING: repo-wide grep conceptually re-confirmed via source read: mission_runtime.js,
  mission_scheduler.js contain no Run class, no run_id, no agent_id; ping_missions
  columns carry no run keying. Attempts, checkpoints, and work packets have nothing
  to hang off of.
- ORCA: deriveRunId = sha256('run:' + objective_id + ':' + run_seq) (TEST H1g);
  registerRun consumes a crash-safe run_seq_used counter in objective.json;
  re-running after a crash registers a NEW run and leaves the old record untouched
  for forensics. 7-state table NOT_STARTED/STARTED/SUSPENDED/SUCCEEDED/FAILED/
  OUTCOME_UNKNOWN/CANCELLED with illegal transitions throwing ErrIllegalTransition
  (TEST H5a-H5h). FAILED is retryable-terminal (RETRY -> NOT_STARTED);
  OUTCOME_UNKNOWN is terminal except CANCEL and can never be auto-retried
  (TEST H5c) — the mechanism-map record-8 invariant is enforced by the table.
- Caveat: zero production callers today (verified: no references to orca_run_record
  or claimRun outside the module and its own test). Unwitnessed in operation;
  shape is proven, wiring is not.

---

## Record 3 — attempt identity

DOMAIN: identity
COMPONENT: attempt entity
CLAIM: PING retries are a bare counter with no attempt record (confirmed GAP 3);
ORCA derives a stable attempt id per (work_order_id, attempt_number) and records
per-attempt outcomes. ORCA stronger.
EVIDENCE: TEST (probe H1f, H10a-H10c) + STATIC (mission_runtime.js failWithRetry;
objective-runtime.js deriveAttemptId, recordAttemptOutcome in orca_control_loop.js)
CALLER: delegate() attempt loop; MissionScheduler._failMission
CALLEE: durable work-order record / ping_missions row
WRITER: attempt loop (recordAttemptOutcome), failWithRetry
READER: reconciler, auditor, retry classifier
AUTHORITY: attempt id derivation (pure); per-attempt outcome log
CLASSIFICATION: ORCA STRONGER->HARVEST
CONFIDENCE: 0.9
BROKEN BOUNDARY: none
DEPENDENCIES: work-order identity (Record 1)
AFFECTS AGENTS: dispatcher, retry policy, auditor

Evidence detail:
- PING: failWithRetry reads `retries`, increments, writes back; on exhaustion
  writes status failed. No attempt id, no per-attempt timestamps, input snapshot,
  or output capture. Only trace of a past attempt is the integer and the
  overwritten error text.
- ORCA: deriveAttemptId(workOrderId, n) = workOrderId + '-attempt-' + n
  (TEST H1f); the delegate() loop records each attempt outcome before dispatch
  (RENDEZVOUS_RECOVERED / DISPATCH_LOST in reconcileRunningWorkOrder);
  authorizeWorkOrder re-authorize preserves attempt_count (TEST H10b), so crash
  recovery never fabricates or resets attempt history.
- Harvest does not require the whole control loop: attempt rows keyed by the
  derived id are the win.

---

## Record 4 — work-order claiming

DOMAIN: claiming
COMPONENT: claim of a unit of work (mission / work order)
CLAIM: Both sides achieve safe claiming by different means; PING wins raw
atomicity (DB conditional claim), ORCA wins idempotent re-claim (crash-safe
rediscovery). Net: EQUIVALENT.
EVIDENCE: TEST (probe H8a-H8b, H10a-H10c, H2a-H2b) + STATIC (assign SQL;
authorizeWorkOrder; claimRun)
CALLER: MissionScheduler._dispatch / orca delegate()
CALLEE: ping_missions row / durable work-order file
WRITER: scheduler / coordinator (single writer)
READER: worker, reconciler
AUTHORITY: PING: the ping_missions row (conditional UPDATE); ORCA: the advisory-lock
fence plus stable work-order identity
CLASSIFICATION: EQUIVALENT
CONFIDENCE: 0.85
BROKEN BOUNDARY: none
DEPENDENCIES: mission identity (Record 1), single-writer discipline (Record 8)
AFFECTS AGENTS: scheduler, dispatcher, coordinator

Evidence detail:
- PING assign(): single UPDATE ... WHERE status='created' sets status/assigned_to/
  claimed_at/lease_until in one statement; rowCount 1 = claimed, 0 = already
  claimed and cannot be stolen (TEST H8a-H8b semantics). This is the strongest
  raw claim primitive in either system: enforced by the database, not by discipline.
- ORCA authorizeWorkOrder: read-then-write, NOT atomic on its own substrate, but
  (a) claim is idempotent by stable identity (re-authorize returns the same
  work_order_id without resetting state, TEST H10a-H10b), and (b) only one
  coordinator can exist at a time (Record 8), removing the race. Budget reserve
  is also idempotent (TEST H10c: no double-spend on re-reserve).
- ORCA claimRun (run-row lease): stale-epoch second claim refused (TEST H2b),
  but the CAS itself is read-check-write and loses updates under true concurrency
  (TEST H3b). Safe only because the module contract requires the caller to hold
  the advisory lock; the module does not enforce it.
- Verdict rationale: PING's claim is enforced-atomic; ORCA's claim is
  discipline-guarded but adds idempotent re-claim across crashes. Neither
  dominates on all axes.

---

## Record 5 — lease acquisition / renewal / expiry

DOMAIN: leases
COMPONENT: lease lifecycle (acquire, renew, expire, reap)
CLAIM: PING has the only fully wired lease lifecycle (60s acquire, per-poll
renewal, expiry reaper). ORCA's run lease has TTL + epoch but no renewal loop,
no expiry enforcement, and no production callers. PING STRONGER on lifecycle;
ORCA's epoch is the harvest.
EVIDENCE: TEST (probe H11a-H11e) + STATIC (renewLease, reapExpiredLeases,
scheduler Arrows 0/1; claimRun ttlMs/expires_at)
CALLER: MissionScheduler._poll / (ORCA: none wired)
CALLEE: ping_missions.lease_until / run record lease block
WRITER: scheduler (renew), reaper (reset), claimRun (acquire)
READER: scheduler, reconciler
AUTHORITY: PING: ping_missions row; ORCA: run record lease block
CLASSIFICATION: PING STRONGER
CONFIDENCE: 0.9
BROKEN BOUNDARY: none
DEPENDENCIES: Record 4 (claiming), Record 6 (fencing)
AFFECTS AGENTS: scheduler, worker supervisor (missing; GAP 11)

Evidence detail:
- PING: assign() acquires 60s lease; scheduler Arrow 0 renews every _processing
  mission each 5s poll before Arrow 1 reaps expired leases (TEST H11b);
  renewLease refuses completed/failed (TEST H8d); reapExpiredLeases resets
  orphaned running/assigned missions to created with MISSION_LEASE_EXPIRED
  events. This is a real, working lease lifecycle.
- Holes (still present, re-confirmed): (1) _dispatch awaits worker with NO
  timeout, and Arrow 0 renews everything in _processing, so a hung worker's
  lease is renewed forever and the reaper never reclaims it (TEST H11a, H11c;
  GAP 5 persists). (2) renewLease has no holder check (TEST H11d): any process
  can renew any mission's lease. (3) complete()/fail() are conditional on
  status only, no holder, no epoch (TEST H12a-H12b): a stale worker's late
  result can complete a mission that was reaped and re-claimed by someone else.
- ORCA run lease: claimRun takes ttlMs, records expires_at, bumps fencing_epoch.
  But: no renewal loop exists, no code reads expires_at to enforce expiry, and
  there are zero production callers. The lease is a data shape, not a lifecycle.
- Harvest direction: ORCA's epoch (Record 6) into PING's wired lifecycle, plus a
  dispatch timeout so the hung-worker hole closes.

---

## Record 6 — fencing epochs

DOMAIN: fencing
COMPONENT: fencing token / generation counter
CLAIM: Neither system enforces fencing at write time, but ORCA has the only
fencing-token mechanism (epoch CAS on the run lease; stale-epoch refusal;
staleness detectable). PING has no generation counter anywhere in
ping_missions. ORCA STRONGER->HARVEST.
EVIDENCE: TEST (probe H2a-H2e, H4a-H4c, H11e) + STATIC (claimRun; ping_missions schema)
CALLER: (ORCA: none wired yet) / PING: n/a
CALLEE: run record lease.fencing_epoch / n/a
WRITER: claimRun
READER: any future writer that checks the epoch
AUTHORITY: run record (new; no competitor)
CLASSIFICATION: ORCA STRONGER->HARVEST
CONFIDENCE: 0.8 (shape proven, operation unwitnessed)
BROKEN BOUNDARY: none
DEPENDENCIES: Record 4 (claiming), Record 5 (leases)
AFFECTS AGENTS: scheduler, coordinator, worker supervisor

Evidence detail:
- PING: ping_missions has no epoch/generation/fencing column (TEST H11e). The
  ABA hazard is real: mission claimed by A -> lease expires -> reaped to created ->
  claimed by B -> stale worker A completes: complete()'s WHERE status='running'
  matches B's run and A's stale result overwrites it (TEST H12a). No token
  distinguishes the generations.
- ORCA: claimRun CAS on fencing_epoch; a claimant presenting a stale epoch is
  refused with {ok:false, reason:'stale-epoch'} (TEST H2b); the current epoch is
  always readable so a stale holder's late writes are detectable (TEST H4c).
- Honest limits (probed): the CAS is not atomic on the file substrate (TEST H3b:
  interleaved read-modify-write loses an update); transitionRun and checkpointRun
  do NOT check the epoch, so a stale holder can still write after losing the
  lease (TEST H4a-H4b). Fencing here is detect-not-prevent, and it only exists
  on the run row, not on work orders. The harvest must add epoch checks to the
  write path, not just the claim path.

---

## Record 7 — coordinator epochs

DOMAIN: fencing
COMPONENT: generation/epoch on the coordinator claim itself
CLAIM: Neither system implements coordinator epochs. The ORCA coordinator claim
is a single PG advisory lock with no generation; a release/re-acquire cycle is
indistinguishable from the first hold. PING has no coordinator at all.
NOT APPLICABLE.
EVIDENCE: STATIC (acquireCoordinatorLock: pg_try_advisory_lock, no epoch
column, no generation in diagnostic record; orca_control_loop.js has no epoch
concept beyond prose)
CALLER: n/a
CALLEE: n/a
WRITER: n/a
READER: n/a
AUTHORITY: n/a
CLASSIFICATION: NOT APPLICABLE
CONFIDENCE: 0.95
BROKEN BOUNDARY: none
DEPENDENCIES: Record 8 (split-brain)
AFFECTS AGENTS: coordinator

Evidence detail:
- Searched orca_control_loop.js for epoch: only prose ("execution/reconciliation
  epoch", "budget epoch") — no mechanism. The advisory lock has no TTL and no
  generation; coordinatorLockKey is a stable derivation, not a generation.
- If a coordinator-epoch mechanism is wanted later (e.g. to fence post-restart
  writers), the run record's fencing_epoch (Record 6) is the natural seed: bump
  a coordinator generation on each successful claim and carry it on writes.

---

## Record 8 — split-brain (two coordinators)

DOMAIN: claiming
COMPONENT: single-coordinator enforcement
CLAIM: ORCA enforces exactly one live coordinator via PG session-level advisory
lock on a dedicated client; a second coordinator is refused and exits. PING has
no scheduler-level single-writer claim: two MissionScheduler instances share the
DB with only the row-level claim as protection. ORCA STRONGER->HARVEST.
EVIDENCE: TEST (probe H9a-H9d) + STATIC (acquireCoordinatorLock;
orca_control_loop.js:1085-1105 claim lifecycle; MissionScheduler has no claim)
CALLER: orca main() at startup / PING: n/a
CALLEE: pg_try_advisory_lock(k1,k2) on dedicated pg.Client
WRITER: lock holder (coordinator)
READER: second coordinator (refused)
AUTHORITY: PostgreSQL advisory lock (database-enforced, session-scoped)
CLASSIFICATION: ORCA STRONGER->HARVEST
CONFIDENCE: 0.9
BROKEN BOUNDARY: none
DEPENDENCIES: none
AFFECTS AGENTS: coordinator, scheduler

Evidence detail:
- ORCA: acquireCoordinatorLock uses pg_try_advisory_lock on a DEDICATED
  pg.Client held for the whole run (the module docstring explicitly rejects the
  pool-based gateway/advisory_lock.js AdvisoryLock as unsound: pool.query could
  acquire on one connection and release on another). Crash safety comes from the
  DB: session drop (incl. SIGKILL) auto-releases; restart acquires cleanly with
  no PID probing across WSL/Windows namespaces (TEST H9a-H9d). The diagnostic
  coordinator-claim.json is explicitly marked non-authoritative (TEST H9c).
- PING: nothing stops two MissionScheduler processes from polling the same DB.
  The row-level assign() claim stays safe, but the Arrow 0/1 renew/reap dance
  assumes one scheduler: scheduler B's reaper can reset a mission whose lease
  merely expired during scheduler A's stall, and B re-dispatches while A's
  worker is still alive -> double execution with the first result silently
  dropped (complete() no-ops on status != 'running').
- Honest limit: ORCA's lock has no TTL/heartbeat (TEST H9d). A coordinator that
  is alive and connected but logically stuck holds the lock forever; there is no
  takeover path for a wedged holder. Crash-only recovery.
- Harvest: a scheduler-level single-writer claim for PING (advisory lock on a
  dedicated client, same pattern), or at minimum a scheduler instance id carried
  on claims so split-brain is detectable.

---

## Record 9 — double-claim races

DOMAIN: claiming
COMPONENT: concurrent claim on the same unit
CLAIM: PING's claim primitive is atomic (single conditional UPDATE, enforced by
PostgreSQL row locking); ORCA's run-lease CAS is read-check-write and provably
loses updates under concurrency, safe only via the external advisory-lock
fence. PING STRONGER on the raw race primitive.
EVIDENCE: TEST (probe H8a-H8b, H3a-H3b) + STATIC (assign SQL; claimRun)
CALLER: competing schedulers / competing claimants
CALLEE: ping_missions row / run record file
WRITER: claimants
READER: n/a
AUTHORITY: PING: database row lock; ORCA: advisory lock (external to the CAS)
CLASSIFICATION: PING STRONGER
CONFIDENCE: 0.95
BROKEN BOUNDARY: none
DEPENDENCIES: Record 4, Record 8
AFFECTS AGENTS: scheduler, coordinator

Evidence detail:
- PING assign(): one statement, WHERE status='created'; two concurrent claims
  serialize on the row lock, exactly one gets rowCount 1 (TEST H8a-H8b models
  the semantics; enforcement is PostgreSQL's).
- ORCA claimRun: loadRun (read) -> compare epoch -> atomicWrite (write). Two
  processes can both read epoch 0 and both write epoch 1; one update is lost
  (TEST H3b, forced interleave). The module's own docstring admits this:
  "the caller MUST hold the coordinator advisory lock (the single-writer
  fence) — this module does not acquire it and will not guess."
- Net: under a true race PING's primitive holds and ORCA's does not; ORCA is
  safe only because races are excluded by design (single coordinator), not
  because the CAS survives them. The harvest for ORCA (if the file substrate
  ever needs multi-writer) is a real atomic primitive; for PING, no change needed.

---

## Record 10 — stale-claim takeover

DOMAIN: leases
COMPONENT: recovery of work from a dead/stale holder
CLAIM: Both sides have working takeover; PING's is TTL-driven and wired
(reaper -> created -> re-claim), ORCA's coordinator takeover is crash-implicit
(PG session death) and its work-order takeover is explicit and careful
(pidAlive check refuses to steal possibly-live work). Net: EQUIVALENT, with
ORCA's reconcile being the more careful design for out-of-process workers.
EVIDENCE: TEST (probe H2c, H8c-H8d) + STATIC (reapExpiredLeases;
reconcileRunningWorkOrder; acquireCoordinatorLock crash-safety note)
CALLER: reaper / restarted coordinator / reconcileStartup
CALLEE: ping_missions row / work-order record / advisory lock
WRITER: reaper, new coordinator
READER: worker, dispatcher
AUTHORITY: PING: lease_until + reaper; ORCA: PG session lifecycle + reconcile logic
CLASSIFICATION: EQUIVALENT
CONFIDENCE: 0.85
BROKEN BOUNDARY: none
DEPENDENCIES: Record 5 (leases), Record 8 (split-brain)
AFFECTS AGENTS: scheduler, coordinator, dispatcher

Evidence detail:
- PING: reapExpiredLeases resets expired running/assigned missions to created;
  the next poll's getPending + assign re-claims them (TEST H8c-H8d show the
  renew/refuse semantics). TTL-driven, automatic, no operator action. Safe in
  its deployment model because workers are in-process: scheduler dead implies
  worker dead.
- ORCA coordinator: no explicit takeover and none needed for crashes — PG
  releases the session lock on session drop, restart acquires (Record 8). Gap:
  wedged-but-connected holder blocks forever (Record 8 limit).
- ORCA work orders: reconcileRunningWorkOrder distinguishes three cases —
  rendezvous result present -> accept; dispatcher pid possibly alive -> LEAVE
  RUNNING, refuse redispatch ("Do NOT claim it stopped"); dispatcher dead and
  no result -> re-authorize for a new attempt. This is strictly more careful
  than PING's reaper: it never steals possibly-live work. ORCA run lease:
  takeover is implicit — anyone presenting the current epoch can claim
  (TEST H2c), even before expiry (TEST H2e: no holder/expiry gate).
- Harvest: PING's reaper could adopt ORCA's liveness check (verify the worker
  is actually dead before resetting), which matters the moment workers move
  out-of-process.

---

## Unknown / investigate

U1. ORCA run-record production wiring: claimRun/transitionRun/checkpointRun have
zero production callers and the run-state table has never gated a real run.
Open question: does the fencing-epoch CAS survive a real multi-process run, or
does the file substrate need an atomic primitive first? Next probe: two real
processes racing claimRun on the same run file (no artificial interleave).

U2. Coordinator wedged-holder: no TTL/heartbeat on the advisory lock. Open
question: what is the acceptable stuck-coordinator detection for ORCA (lease
with renewal? operator break-glass?)? Needs Nolan's call before building.

---

## Harvest specs (for every ORCA STRONGER win)

### HS-1: key-order-stable mission identity (from Record 1)
What: replace JSON.stringify(payload) in MissionRuntime.create's idempotency
key with a canonical stable stringify (sorted keys, explicit types, reject
non-finite), and keep the full 64-hex (or keep 16-hex truncation but document
it). Same logical payload must always mint the same mission_id regardless of
key order.
Into: /home/nolan/ping ping-runtime/orchestration/mission_runtime.js create()
(around line 79-90). Pure function, no schema change, no migration.
Proof: probe H1j (bug) -> H1k (fix shape).

### HS-2: durable run record + deterministic run identity (from Record 2)
What: a run entity keyed by sha256('run:' + objective_or_scope_id + ':' +
run_seq), with the 7-state lifecycle table (NOT_STARTED/STARTED/SUSPENDED/
SUCCEEDED/FAILED/OUTCOME_UNKNOWN/CANCELLED), illegal transitions throwing,
FAILED retryable-terminal via RETRY->NOT_STARTED, OUTCOME_UNKNOWN terminal
except CANCEL and never auto-retryable. Attempts, checkpoints, and work
packets hang off run_id.
Into: PING spine as a new ping_runs table (or the file substrate if the spine
adopts it), owned by MissionRuntime or a new RunRuntime; the 7-state table as a
pure module mirroring orca_run_record.js applyRunTransition/ legalRunEvents/
isTerminalRunState. Do NOT create a second event store; the run record is
state, not events.
Proof: probes H1g, H5a-H5h.

### HS-3: attempt identity + per-attempt records (from Record 3)
What: attempt_id = mission_or_work_order_id + '-attempt-' + n (stable,
deterministic); a per-attempt record (started_at, ended_at, input ref,
outcome, error) written before dispatch and updated after; re-claim after
crash preserves attempt_count (never resets).
Into: ping_missions companion table ping_attempts (mission_id FK,
attempt_seq, attempt_id PK, timestamps, outcome, error, input_ref); writer is
MissionScheduler._dispatch; reader is the retry classifier and auditors.
Proof: probes H1f, H10a-H10b.

### HS-4: fencing epoch on leases, enforced at write time (from Record 6)
What: add generation/fencing_epoch to the lease (ping_missions.lease_epoch
integer, default 0). Claim bumps it; renew/complete/fail carry the epoch the
caller holds and the UPDATE's WHERE clause requires lease_epoch = presented
epoch. Stale-epoch writes become rowCount 0 instead of silent overwrites.
This closes the ABA hazard (Record 6) where a stale worker's late complete()
overwrites a re-claimed mission's result. Enforcement must be in the SQL
WHERE clause (atomic), not read-check-write in JS — Record 9 proves the file
CAS is insufficient; do not copy claimRun's non-atomic shape, copy its token
shape.
Into: ping-runtime/orchestration/mission_runtime.js: schema (initialize()),
assign(), renewLease(), complete(), fail(), failWithRetry(), reapExpiredLeases()
(which bumps the epoch on reset so old holders are fenced).
Proof: probes H11e (missing), H12a (hazard), H2b (token shape).

### HS-5: single-writer scheduler claim (from Record 8)
What: one scheduler instance holds a PG session-level advisory lock on a
DEDICATED pg.Client (never a pool; objective-runtime.js documents why the
pool-based gateway AdvisoryLock is unsound) for the whole scheduler run;
a second scheduler logs and exits instead of double-polling. Crash safety
from session drop; diagnostic (non-authoritative) instance record optional.
Into: ping-runtime/orchestration/mission_scheduler.js start() (acquire) and
stop()/SIGTERM (release); lock key derived stably, e.g. sha256
('ping-scheduler-v1') -> two int32s, mirroring coordinatorLockKey.
Proof: probes H9a-H9d.

### HS-6: liveness-checked stale-claim takeover (from Record 10)
What: before the reaper resets an expired-lease mission to created, check
whether the worker is actually dead (ORCA's pidAlive gate generalized:
process liveness today, heartbeat/job-id liveness when workers go
out-of-process). If possibly alive, leave it and alarm instead of stealing.
Into: MissionRuntime.reapExpiredLeases() — add an optional liveness hook;
MissionScheduler passes its worker-registry liveness check.
Proof: reconcileRunningWorkOrder's three-way branch (accept rendezvous /
leave RUNNING / re-authorize).

---

## Failure pipeline log

- F1 (LOCAL ACCIDENT): probe2.js H9c regex /NOT the/ did not match the
  diagnostic note's lowercase "not this file". Repro: node probe2.js before
  fix -> 13 pass 1 fail. Fixture: the note string itself. Fix: case-insensitive
  regex; rerun -> 14/14. Owning lane: ORCA-A (probe harness). No memory entry
  (harness typo, no durable lesson beyond "match the literal").
- F2 (LOCAL ACCIDENT): two exec calls hit "failed to store metadata for
  session ... timed out after 15s registering session metadata". Transient
  runtime hiccup; retried unchanged, succeeded. No action.

## Verdict summary table

| Mechanism | Verdict | One-line evidence |
|---|---|---|
| mission identity | ORCA STRONGER->HARVEST | PING's payload hash is not key-order stable (H1j); ORCA stableStringify is (H1k) |
| run identity | ORCA STRONGER->HARVEST | PING has no Run entity (GAP 1 re-confirmed); ORCA has deterministic run id + 7-state lifecycle (H1g, H5) |
| attempt identity | ORCA STRONGER->HARVEST | PING retries are a bare counter (GAP 3); ORCA derives stable attempt ids + records outcomes (H1f, H10) |
| work-order claiming | EQUIVALENT | PING: atomic conditional claim; ORCA: idempotent re-claim under single-writer discipline |
| lease acquisition/renewal/expiry | PING STRONGER | PING has the only wired lifecycle (60s/renew/reap); ORCA's run lease is an unwired data shape; hung-worker hole persists (H11) |
| fencing epochs | ORCA STRONGER->HARVEST | Only ORCA has a fencing token (epoch CAS, stale-epoch refusal); PING has no generation column (H11e); ORCA's is detect-not-prevent (H4) |
| coordinator epochs | NOT APPLICABLE | Neither implements; ORCA's advisory lock has no generation |
| split-brain (two coordinators) | ORCA STRONGER->HARVEST | ORCA: PG advisory lock, second exits, crash auto-release (H9); PING: no scheduler claim |
| double-claim races | PING STRONGER | PING claim is DB-atomic; ORCA file CAS provably loses updates (H3b), safe only via external lock |
| stale-claim takeover | EQUIVALENT | PING: TTL reaper wired; ORCA: crash-implicit coordinator + careful pidAlive work-order reconcile |

Counts: ORCA STRONGER->HARVEST: 4 | PING STRONGER: 2 | EQUIVALENT: 2 |
NOT APPLICABLE: 1 | UNKNOWN->INVESTIGATE: 1 (U1 run-record wiring; U2 wedged-holder policy) |
PATTERN ONLY: 0 | REJECT: 0.

Harvest specs produced: HS-1 through HS-6 (all six target PING components in
/home/nolan/ping, branch refactor/runtime-authority-convergence).

Open UNKNOWNs: U1 (run-record CAS under real multi-process race), U2
(wedged-coordinator-holder policy needs Nolan's call).

Moved to next (follow-on queue): fencing under clock skew -> lease-expiry
races -> multi-coordinator fencing -> write harvest specs (done above, HS-1..HS-6)
-> probe the next identity mechanism discovered (coordinator-generation seeding
from run fencing_epoch, per Record 7 note).
