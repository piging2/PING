# ORCA-B Verdicts — checkpoint / resume / reconciliation / dependency-graph / death / duplicate-completion

Lane: ORCA-B, ORCA FINISH program. Date: 2026-09-23/24 MDT.
Targets (all read-only): A5 branch `/home/nolan/worktrees/orca-autonomy` @ `ae55b77ff`
(`feature/orca-autonomy`); W2-IMPL-STATE `/home/nolan/ping-orca-state` @ `orca-finish/state`
(`30a750fad`), modules staged at `wave2/impl-state/staging/orca-payload/`; mainline
`/home/nolan/ping` @ `cc6856c3`.
Evidence grades: STATIC (read source) / TEST (ran code or harness) / LIVE (witnessed live execution).
Deliverable dir: `~/workspace/orca-finish/program/orca-b/` (probes in `probes/`).

## Semantic rules adopted (CRITIC-SEMANTIC, 2026-09-24)

1. Two state machines, never conflated. The work-order *ledger* is
   `orca/control-loop/policy/orca_status_model.js`: 10 delegation-unit states
   (PLANNED/AUTHORIZED/QUEUED/RUNNING/BLOCKED/FAILED/EVIDENCE_PENDING/
   VERIFICATION_FAILED/VERIFIED/CLOSED); terminal = FAILED/VERIFICATION_FAILED/CLOSED.
   Completion is VERIFIED -> CLOSED; no COMPLETED state exists in that ledger.
   The *durable work-order record* (`objective-runtime.js` + `isTerminalWorkOrder`
   in `orca_control_loop.js`) uses COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED
   as its terminal record states. Quote each set only for its own machine.
2. RETRY is fail-path only. The lease path is called "lease-reclaim", never "retry".
3. "Deterministic" is banned in identity claims unless the derivation domain is stated
   (e.g. "run identity = sha256('run:'+objective_id+':'+run_seq)").

## Witnessed evidence folded in (W2-GAUNTLET-INFRA, 2026-09-24 03:03 UTC)

TEST-A6 PASSED (results: `wave2/gauntlet/results/a6-grade.json`, `a6-workorder.json`,
`a6-run2-tail.log`; ledger: WAVE-LEDGER.md "Program result: W2-GAUNTLET-INFRA").
Real `feature/orca-autonomy` loop SIGKILLed mid-dispatch (work order
`bfcec15b...` RUNNING, `dispatch_pid` 16931 durably recorded), restarted on the same
objective text -> same objective_id `5ea07457...`. Run 2: re-acquired the PG
advisory-lock claim; `reconcileStartup()` ran BEFORE any dispatch, found the RUNNING
order; attempt-1 classified DISPATCH_LOST (dispatcher dead, no rendezvous) and
re-authorized as NEW attempt-2 (never re-run as attempt-1); durable budget read 1/2
(not reset). Attempt-2: Hermes worker produced zero output in 180s -> honest
coordinator-constructed failed envelope ("no worker output captured; no success
fabricated") -> canonical WORKER_FAILED event `event_b8c9060c4d342a46` in scratch
`ping_events` -> budget 2/2 exhausted -> escalated, exit 3. Work order terminal
FAILED, `attempt_history=[DISPATCH_LOST, WORKER_FAILED]`, objective left ACTIVE
(not falsely completed). G1-G6 all PASS. The 2026-09-18 A6 FAIL is witnessed-fixed.
Isolation: scratch-only (container `ping-gauntlet-pg`, 127.0.0.1:54339 loopback);
production untouched.

Synthetic suite 9/9 PASS (same lane): t_worker_death, t_coord_death (stale-epoch
claim rejected, 0 zombie rows; requeued attempt 2, no duplicate dispatch),
t_timeout_after_effect (post-boundary -> OUTCOME_UNKNOWN not requeued/not success;
pre-boundary control -> FAILED requeueable), t_double_claim (exactly one winner),
t_lease_expiry (fail closed), t_stale_checkpoint (forged digest + monotonic violation
rejected), t_result_lost (honest OUTCOME_UNKNOWN, result not invented),
t_ack_lost (0 duplicate dispatch on SUCCEEDED), t_db_disappear (0 phantom rows).

What this changes in the verdicts below: resume-after-death, reconcileStartup,
worker death, and coordinator death move from STATIC/TEST to LIVE. The timeout
honest-failure path (T1/T4 in the matrix) is LIVE-proven. The T2/T3 residuals
(orphaned Windows worker completing after coordinator timeout) were NOT witnessed;
the OUTCOME_UNKNOWN handling for them is proven only in the synthetic harness
(W2-IMPL-STATE semantics), not in the branch loop.

## Record 1 — checkpointing

DOMAIN: orca-b / COMPONENT: `orca_run_record.checkpointRun` (W2-IMPL-STATE) +
`objective-runtime.atomicWrite` + dispatcher rendezvous drops (A5 branch) /
CLAIM: checkpoints are versioned, monotonic, content-addressed, and atomic, so a
restart can only ever observe the previous complete checkpoint or nothing /
EVIDENCE: TEST (staged suites run locally: `orca_run_record.test.js` 16 pass /
1 skip — skip is the [wired] suite needing the branch path, which passes 24/24 on
the Pig per `wave2/impl-state/STATE-LAYER.md`; `orca_ready_set.test.js` 16/16;
monotonic bump, stale-epoch CAS refusal, and illegal-transition totality all
exercised) + STATIC (branch: temp-file + os.replace / renameSync in
`hermes_dispatch.py` and `atomicWrite`; attempt recorded before dispatch) /
CALLER: `orca_control_loop.delegate` / `dispatchHermes` / CALLEE: `checkpointRun`,
`atomicWrite`, rendezvous drop writer / WRITER: loop (run records), dispatcher
(rendezvous), W2 module (versions) / READER: `reconcileStartup`,
`reconcileRunningWorkOrder`, `loadRun` / AUTHORITY: single coordinator (PG
advisory-lock claim); the checkpoint file is evidence, not authority /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY: none
found; the PING spine has no checkpoint mechanism at all (GAPS.md GAP 4,
re-confirmed) / DEPENDENCIES: branch `objective-runtime.js` (wired by DI in W2;
production wiring is a require post-merge) / AFFECTS AGENTS: orca-b, w2-impl-state,
w2-gauntlet-infra (synthetic t_stale_checkpoint: forged digest + monotonic
violation rejected — the digest discipline this record harvests).
HARVEST: H1 — monotonic versioned checkpoints with content-addressed snapshot refs;
atomic temp+rename writes; checkpoint version only moves forward; restore refuses
stale/missing/tampered checkpoints.

## Record 2 — resume after death

DOMAIN: orca-b / COMPONENT: `orca_control_loop.main` + `reconcileStartup` (A5
branch); `orca_run_record.loadRun/listRuns` (W2) / CLAIM: a killed coordinator
restarts into the same objective and resumes from durable state instead of
starting over or duplicating work / EVIDENCE: LIVE (TEST-A6: SIGKILL mid-dispatch
-> restart -> same objective_id `5ea07457...` re-derived from intent text ->
advisory lock re-acquired -> reconcile before dispatch -> attempt-1 DISPATCH_LOST
-> attempt-2 dispatched -> honest failure -> WORKER_FAILED event
`event_b8c9060c4d342a46` -> budget exhausted -> escalate exit 3; work order
FAILED with `attempt_history=[DISPATCH_LOST, WORKER_FAILED]`; objective ACTIVE) /
CALLER: `run-loop.sh` / CALLEE: `reconcileStartup`, `delegate`, policy classifiers /
WRITER: loop (durable `objectives/<id>/` state) / READER: restarted loop /
AUTHORITY: PG advisory lock (single coordinator); durable filesystem state /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high (witnessed) / BROKEN
BOUNDARY: none in the witnessed path / DEPENDENCIES: H2, H3 / AFFECTS AGENTS:
orca-b, w2-missions (INTERRUPTION-DRILL D2 doubles as this re-proof — now
witnessed-fixed), agent19 (routed to challenge the re-proof).
HARVEST: H2 — the full crash-safe startup sequence: intent-only objective identity
-> durable budget read (1/2, not reset) -> cancellation check -> terminal-objective
refusal -> advisory-lock claim -> reconcileStartup BEFORE any dispatch.

## Record 3 — reconcileStartup (stale state across restart)

DOMAIN: orca-b / COMPONENT: `reconcileStartup()` + `reconcileRunningWorkOrder()`
(A5 branch, `orca_control_loop.js`) / CLAIM: startup reconciliation classifies
every durable work order before new dispatch: rendezvous result present ->
verify/accept (RENDEZVOUS_RECOVERED); no result + dispatcher possibly alive
(`process.kill(pid,0)`) -> stays RUNNING, delegate refuses redispatch; no result
+ dispatcher verifiably dead -> DISPATCH_LOST -> re-authorized AUTHORIZED for a
new attempt within budget; terminal record states never regenerated; unknown
record states logged and left untouched / EVIDENCE: LIVE (TEST-A6: found RUNNING
order `bfcec15b...`, classified attempt-1 DISPATCH_LOST, re-authorized as NEW
attempt-2, never re-ran attempt-1) + STATIC (three branches traced; bounded
30s/2s wait for a possibly-alive dispatcher) / CALLER: `main()` step 5 /
CALLEE: `objRuntime.listWorkOrders/readRendezvousResult/updateWorkOrder`,
`collectRendezvousDrop`, `acceptRendezvousResult` / WRITER: loop (reconcile notes,
attempt outcomes, `reconcile-startup.json`) / READER: `delegate` (refuses RUNNING
redispatch) / AUTHORITY: PG advisory lock; the reconcile decision is the
coordinator's, evidence-persisted / CLASSIFICATION: ORCA STRONGER→HARVEST /
CONFIDENCE: high (witnessed) / BROKEN BOUNDARY: (a) `pidAlive` trusts a PID that
can be recycled across a WSL reboot -> false "alive" leaves a work order RUNNING
forever with delegate refusing redispatch (stall, not corruption); (b) no
UNKNOWN classification exists in either state machine — "dispatcher dead, no
rendezvous" is treated as known-lost, but the Windows Hermes child can outlive
the SIGKILLed dispatcher, so "no rendezvous" does not imply "worker did not run"
(see record 15, T3) / DEPENDENCIES: H1, H3 / AFFECTS AGENTS: orca-b, w2-missions
(drill D2 expectation (b) — see challenge section), agent19.
HARVEST: H2 (continued) — the three-branch reconcile with bounded wait and
explicit lost classification; REQUIRED HARDENING before harvest: (i) an
OUTCOME_UNKNOWN classification for the cannot-distinguish-lost-from-orphaned
case (W2 `blockedWorkOrderIds` semantics, synthetic-proven), (ii) a rendezvous
drop timestamp-vs-attempt-started_at guard (see record 11).

## Record 4 — dependency graphs

DOMAIN: orca-b / COMPONENT: `orca_ready_set.readyWorkOrders` (W2-IMPL-STATE);
A5 branch `assessAndFollowUp`; mainline `EVENT_MISSION_MAP` /
CLAIM: dependency edges are data, and readiness is a pure query over them; the
A5 branch has no dependency graph (follow-up is a hardcoded linear t2); the PING
spine has no declared DAG (GAPS.md GAP 6, re-confirmed: chains emerge only from
workers emitting the next event type) / EVIDENCE: TEST (staged
`orca_ready_set.test.js` 16/16 locally: diamond fixture, partial completion,
failed-dep blocking, unresolved-unknown blocking, RUNNING not re-claimed,
unknown states fail closed, cycle/missing/self-dep degrade to never-ready, order
preserved) + STATIC (branch `assessAndFollowUp` is objective-specific t2 logic;
spine maps are flat lookups) / CALLER: (future) loop dispatcher / CALLEE: none
(pure; no scheduler import) / WRITER: (future) work-order records carry
`depends_on` / READER: `readyWorkOrders` / AUTHORITY: none asserted — the query
is advisory until wired into the loop's claim path / CLASSIFICATION: ORCA
STRONGER→HARVEST (for the W2 pure-query pattern; the branch contributes nothing
here) / CONFIDENCE: high for the query; the wiring is the open work /
BROKEN BOUNDARY: none in the query; the missing piece is the loop actually
calling it before dispatch / DEPENDENCIES: `depends_on` field on the work-order
record (ADAPT tail, per STATE-LAYER.md) / AFFECTS AGENTS: orca-b, w2-impl-state.
HARVEST: H4 — `readyWorkOrders(workOrders, {blockedWorkOrderIds})`: claimable =
AUTHORIZED only; every `depends_on` in terminal-success (COMPLETED record
state); unresolved-unknown set never ready; fail-closed degradation (missing /
self / cycle -> never ready, never hang).

## Record 5 — ready-set queries

DOMAIN: orca-b / COMPONENT: `orca_ready_set` (W2) vs `MissionRuntime.getPending`
(mainline) / CLAIM: the ready-set query subsumes the spine's pending query: the
spine's `getPending` is status-only (`created`, or `retry_pending` past
`retry_at`); the ORCA query adds claimable-state gating, dependency satisfaction,
and unknown-blocking / EVIDENCE: TEST (16/16, record 4) + STATIC (spine
`getPending` SQL: `WHERE status='created' OR (status='retry_pending' AND
retry_at<=NOW())`, no dependency or unknown concepts) / CALLER: (future)
dispatcher / CALLEE: none (pure) / WRITER: n/a / READER: (future) loop /
AUTHORITY: advisory until wired / CLASSIFICATION: ORCA STRONGER→HARVEST /
CONFIDENCE: high / BROKEN BOUNDARY: none / DEPENDENCIES: H4 / AFFECTS AGENTS:
orca-b, w2-impl-state.
HARVEST: part of H4 — wire the pure query into the loop's pre-dispatch claim
path so readiness, not poll order, decides what dispatches.

## Record 6 — successor work / follow-up

DOMAIN: orca-b / COMPONENT: `assessAndFollowUp` (A5 branch) / CLAIM: follow-ups
are proposed only from verified evidence, with `causation_id` = prior
`WORKER_COMPLETED` event_id and input built from live state at follow-up time /
EVIDENCE: STATIC (traced: `classifyFollowUp` gates on `derivedFromVerified`;
t2 input from live `getTrace` + mission-lifecycle query at follow-up time) +
LIVE-adjacent (A5 witnessed run `orca-run-mu6wmbzn`: t2 chained with shared
`correlation_id` and causal linkage, per A5-VERDICT.md; not re-witnessed in
TEST-A6, which escalated before follow-up) / CALLER: `main()` /
CALLEE: `delegate` (taskKey `t2-chain-verify`, stable work_order_id so a restart
rediscovers COMPLETED and returns cached) / WRITER: loop (`20-assess.json`,
`policy-followup.json`) / READER: `delegate` / AUTHORITY: policy classifier
(advisory); adapter authorization (final gate) / CLASSIFICATION: PATTERN ONLY /
CONFIDENCE: medium-high / BROKEN BOUNDARY: none found; scope is honestly bounded
/ DEPENDENCIES: H4 (the general successor mechanism is the ready-set, not this
hardcoded t2) / AFFECTS AGENTS: orca-b.
RATIONALE: the mechanism is real but objective-specific (evidence-chain
verification for the audit objective), not a general successor engine. Harvest
the pattern — causation-linked, built-from-live-state, verified-evidence-only
follow-up — not the implementation. The general harvest is H4.

## Record 7 — blocked-work model

DOMAIN: orca-b / COMPONENT: `blockedWorkOrderIds` in `orca_ready_set` (W2 spec)
+ `OUTCOME_UNKNOWN` run state in `orca_run_record` (W2) + BLOCKED ledger state
(A5 branch) / CLAIM: work that crossed a side-effect boundary with an
indeterminate outcome must be blocked from auto-claim and auto-retry; only an
explicit decision (or idempotent-keyed reconcile) releases it / EVIDENCE: TEST
(staged suites: unresolved-unknown blocking 16/16; run transitions:
OUTCOME_UNKNOWN -> only CANCEL, never auto-retry; table total over 7x8 pairs) +
TEST-synthetic (gauntlet t_timeout_after_effect: post-boundary timeout ->
OUTCOME_UNKNOWN, not requeued, not success; pre-boundary control -> FAILED
requeueable; t_result_lost: honest OUTCOME_UNKNOWN, result not invented, not
marked success) + STATIC (branch has NO unknown classification in either state
machine; the branch's BLOCKED = awaiting human precondition, a different
concept) / CALLER: (future) `readyWorkOrders`, `transitionRun` / CALLEE: n/a /
WRITER: classifier (future branch wiring) / READER: ready-set query / AUTHORITY:
human/operator for release; the block itself is automatic / CLASSIFICATION:
ORCA STRONGER→HARVEST / CONFIDENCE: high for the specified semantics; the branch
wiring is the open work / BROKEN BOUNDARY: the branch loop does not implement
this — its timeout path resolves ambiguity as failed + fail-path retry
(at-least-once), which is exactly the T2/T3 residual in record 15 / DEPENDENCIES:
H4, H1 / AFFECTS AGENTS: orca-b, w2-impl-state, w2-missions (drill D2 (b)).
HARVEST: H5 — OUTCOME_UNKNOWN as terminal-except-administrative-cancel on the
run record; `blockedWorkOrderIds` plumbed into the loop's reconcile and
pre-dispatch paths; release requires an explicit recorded decision.

## Record 8 — worker death

DOMAIN: orca-b / COMPONENT: `reconcileRunningWorkOrder` DISPATCH_LOST branch +
`dispatchHermes` (coordinator SIGKILLs dispatcher on 180s timeout) (A5 branch);
mainline `reapExpiredLeases` + Arrow-0 lease renewal / CLAIM: a dead worker is
detected (dispatcher PID dead + no rendezvous) and its attempt is explicitly
classified lost, never silently assumed; the mainline's lease-reclaim cannot do
this for in-scheduler workers (see challenge section) / EVIDENCE: LIVE (TEST-A6:
attempt-1 DISPATCH_LOST with note "dispatcher dead, no rendezvous result",
re-authorized as NEW attempt-2 within the durable 1/2 budget) + TEST (harness
`probes/hung-worker-harness.js` against the REAL mainline modules: 3 hung
workers -> 24 lease renewals, 0 reaps, 4th mission never dispatched — the
mainline cannot detect worker death for in-`_processing` missions at all) /
CALLER: `reconcileStartup` / CALLEE: `pidAlive`, `collectRendezvousDrop`,
`recordAttemptOutcome` / WRITER: loop (attempt_history, reconcile_note) /
READER: `delegate` (new attempt), auditors (attempt_history) / AUTHORITY:
coordinator's reconcile decision, evidence-persisted / CLASSIFICATION: ORCA
STRONGER→HARVEST / CONFIDENCE: high (witnessed) / BROKEN BOUNDARY: (a) PID-reuse
false "alive" (record 3); (b) the SIGKILLed dispatcher's Windows Hermes child
can outlive it and complete after the loss classification (record 15, T3) /
DEPENDENCIES: H1, H2 / AFFECTS AGENTS: orca-b, agent19 (their C2 attack question
is answered: the causal link is demonstrated, not speculative).
HARVEST: H2 (continued) — attempt recorded BEFORE dispatch (closes the
dispatched-but-unrecorded window); dispatcher PID persisted durably before the
worker can finish; explicit DISPATCH_LOST classification with durable note;
re-dispatch only as a NEW attempt identity within a durable budget.

## Record 9 — coordinator death

DOMAIN: orca-b / COMPONENT: `acquireCoordinatorLock` (PG session-level advisory
lock on a dedicated `pg.Client`) + intent-only objective identity (A5 branch);
`claimRun` fencing-epoch CAS (W2) / CLAIM: exactly one live coordinator owns an
objective; a dead coordinator's claim is released by the database on session
drop (SIGKILL-safe), so a restarted coordinator re-acquires cleanly with no
stale-holder guessing across WSL/Windows PID namespaces / EVIDENCE: LIVE
(TEST-A6: run 2 re-acquired the claim after run 1's SIGKILL; same objective_id
re-derived from the same intent text) + TEST (staged `claimRun` CAS: correct
epoch claims, stale epoch refused; synthetic t_coord_death: stale-epoch claim
rejected, 0 zombie rows, requeued attempt 2 with no duplicate dispatch;
t_double_claim: exactly one winner) + STATIC (dedicated-client discipline;
explicit refusal of the gateway's pool-based `AdvisoryLock` unsoundness) /
CALLER: `main()` step 4 / CALLEE: `pgClient.query('SELECT pg_try_advisory_lock…')` /
WRITER: PostgreSQL (lock); loop (`coordinator-claim.json`, diagnostic only,
explicitly NOT the authority) / READER: any would-be second coordinator (exits,
code 5) / AUTHORITY: PostgreSQL session semantics / CLASSIFICATION: ORCA
STRONGER→HARVEST / CONFIDENCE: high (witnessed + synthetic) / BROKEN BOUNDARY:
none found / DEPENDENCIES: none / AFFECTS AGENTS: orca-b, w2-impl-state.
HARVEST: H3 — single-coordinator claim as a PG session-level advisory lock on a
dedicated client (never a pool); lock key = sha256('orca-coordinator-v1:' +
objective_id) as two int32s; diagnostic claim file labeled non-authoritative;
fencing-epoch CAS as the second layer so a stale holder's late writes are
detectable even if lock discipline is ever bypassed.

## Record 10 — duplicate completion

DOMAIN: orca-b / COMPONENT: `UnifiedEventRuntime.emit` (PING spine,
`ping-runtime/events/unified_event_runtime.js`) + `recordVerifiedResult` (A5
branch adapter) / CLAIM: emitting the same verified result twice does not create
two canonical events: event identity = hash over (eventType, source, namespace?,
logical_id|payload); `INSERT … ON CONFLICT (event_id) DO NOTHING`; the emit
returns a `deduplicated` flag and the same event_id / EVIDENCE: STATIC (spine
source: identity construction lines ~73-84, ON CONFLICT line ~157, dedup counter
~165) + TEST (synthetic t_ack_lost: 0 duplicate dispatch on SUCCEEDED; staged
branch behavior: restart re-accept converges to the same event_id via the same
rendezvous envelope) / CALLER: `recordVerifiedResult` / CALLEE:
`eventRuntime.emit` / WRITER: PING spine (the ONLY canonical event writer; ORCA
mints no event identity — A5-VERDICT.md) / READER: measurements, auditors /
AUTHORITY: PING spine (event identity + dedup) / CLASSIFICATION: PING STRONGER /
CONFIDENCE: high / BROKEN BOUNDARY: none; this is the authority boundary working
as designed / DEPENDENCIES: none / AFFECTS AGENTS: orca-b, w2-gauntlet-infra.
HARVEST: H6 — always emit canonical completion through the spine's emit with a
stable `logical_id` (here: the envelope's `result_id`); never mint event
identity outside the spine; treat `deduplicated=true` as the expected
crash-window outcome, not an error. This is the mechanism that makes the
crash-between-emit-and-terminal-marking window safe.

## Record 11 — stale completion

DOMAIN: orca-b / COMPONENT: `collectRendezvousDrop` (attemptId-scoped drop
collection, A5 branch) / CLAIM: a rendezvous drop written by a prior attempt can
be collected by a later attempt with the same attempt id, because attempt ids
are stable per (objective_id, task_key, attempt_number) and objective ids are
stable per intent text across runs / EVIDENCE: STATIC (drop path =
`C:\Windows\Temp\orca-rendezvous-<attemptId>.json`; `collectRendezvousDrop`
renames by attemptId with no timestamp/metadata freshness check against the
attempt's `started_at`; the drop metadata carries `dispatch_started_at` but
nothing compares it; `last_attempt_id` is nulled on fail-path retry, orphaning
the late drop for later collection) / CALLER: `dispatchHermes`,
`reconcileRunningWorkOrder` / CALLEE: filesystem rename / WRITER: dispatcher /
READER: coordinator / AUTHORITY: none asserted for freshness / CLASSIFICATION:
UNKNOWN→INVESTIGATE / CONFIDENCE: medium (mechanism is real in source; no live
occurrence observed) / BROKEN BOUNDARY: the missing freshness guard — a stale
drop is structurally indistinguishable from a fresh one at collection time /
DEPENDENCIES: H1 / AFFECTS AGENTS: orca-b, w2-impl-state.
INVESTIGATION: needs a live race (orphaned drop + same-objective rerun reaching
the same attempt number). REQUIRED HARDENING regardless: compare the drop's
`dispatch_started_at` against the attempt record's `started_at` at collection;
refuse stale drops and audit the refusal. (Synthetic t_stale_checkpoint proves
the adjacent digest discipline — forged digest + monotonic violation rejected —
but not this collection race.)

## Record 12 — late completion

DOMAIN: orca-b / COMPONENT: coordinator 180s timeout -> `timeoutEnvelope` ->
fail-path retry (A5 branch); W2 `OUTCOME_UNKNOWN` spec / CLAIM: a result
arriving after the outcome was decided is explicitly classified, never silently
dropped or silently accepted; the branch's current classification
(failed + fail-path retry) is honest but incomplete for the post-boundary case /
EVIDENCE: LIVE (TEST-A6 attempt-2: zero worker output in 180s -> honest failed
envelope "dispatcher timeout after 180000ms; no worker output captured; no
success fabricated" -> WORKER_FAILED -> budget exhausted -> escalate) + TEST
(synthetic t_result_lost: effect acked but result lost -> honest
OUTCOME_UNKNOWN, result not invented, not marked success) + STATIC (the late
drop is orphaned: `last_attempt_id` nulled on retry, so no future collection
can reconcile it) / CALLER: `delegate` timeout path / CALLEE: `timeoutEnvelope`,
`classifyRetry` / WRITER: loop (attempt outcome TIMED_OUT, honest envelope) /
READER: auditors / AUTHORITY: coordinator (timeout) + policy (retry class) /
CLASSIFICATION: PATTERN ONLY / CONFIDENCE: medium-high / BROKEN BOUNDARY: the
late result has no path back into the record — it is orphaned, not reconciled;
the W2 OUTCOME_UNKNOWN + blocked-set wiring is the specified completion /
DEPENDENCIES: H5 / AFFECTS AGENTS: orca-b, w2-impl-state.
RATIONALE: carry the pattern — late results must be explicitly classified with
an honest, labeled envelope — not the current orphaning implementation. The
harvest target is H5.

## Record 13 — effect-before-ack

DOMAIN: orca-b / COMPONENT: attempt-before-dispatch + rendezvous accept path
(A5 branch); spine emit idempotency (record 10) / CLAIM: the
dispatched-but-unrecorded crash window is closed by construction: the attempt is
persisted (RUNNING, attempt id, dispatcher PID) BEFORE the worker can finish;
if the coordinator dies after the worker's effects but before acceptance, the
restart accepts via the rendezvous file and canonical emission converges to the
same event_id (record 10) / EVIDENCE: STATIC (delegate: `updateWorkOrder`
RUNNING + `recordAttemptOutcome` DISPATCHING precede `dispatchHermes`; PID
persisted the moment the dispatcher exists) + LIVE-adjacent (TEST-A6 proved the
mirror window: kill before dispatch -> DISPATCH_LOST -> clean re-dispatch; the
kill-after-emit window is covered by the spine's ON CONFLICT dedup) /
CALLER: `delegate` / CALLEE: `objRuntime.updateWorkOrder`, `dispatchHermes` /
WRITER: loop (attempt record) / READER: `reconcileStartup` / AUTHORITY:
coordinator + spine (emission) / CLASSIFICATION: ORCA STRONGER→HARVEST /
CONFIDENCE: high / BROKEN BOUNDARY: none in the coordinator-side window; the
exterior agent's own side effects remain at-least-once (record 15, T3) /
DEPENDENCIES: H1, H6 / AFFECTS AGENTS: orca-b.
HARVEST: part of H2 — the ordering invariant: persist the attempt (id, state,
dispatcher PID) before spawning the worker; never the reverse.

## Record 14 — ack-before-effect

DOMAIN: orca-b / COMPONENT: `verifyResultEnvelope` + `gateResultAcceptance` +
`recordVerifiedResult` (A5 branch); `MissionRuntime.complete` (mainline) /
CLAIM: canonical recording happens only after the worker's output exists and
passes verification; neither system emits completion before the effect it
records — with one labeled exception: the coordinator-constructed timeout
envelope, which is explicitly marked "dispatcher-side timeout report, not
worker output" / EVIDENCE: STATIC (branch: `extractEnvelope` -> `gateResultAcceptance`
-> `verifyResultEnvelope` -> `recordVerifiedResult`; invalid envelopes are
non-retryable and can never reach the spine; mainline: `complete()` only after
`dispatch()` returns ok) / CALLER: `delegate` / CALLEE: adapter /
WRITER: spine (canonical events) / READER: measurements, auditors / AUTHORITY:
spine for events; adapter verification for acceptance / CLASSIFICATION:
EQUIVALENT / CONFIDENCE: high / BROKEN BOUNDARY: none; the timeout envelope is
the honest, labeled boundary case, not a violation / DEPENDENCIES: none /
AFFECTS AGENTS: orca-b.
RATIONALE: both systems gate recording on worker return/verification, and
neither controls exterior side effects. No harvest either way; keep the
verification-before-emission ordering as a shared invariant.

## Record 15 — timeout-after-effect

DOMAIN: orca-b / COMPONENT: `dispatchHermes` coordinator timeout (SIGKILLs the
WSL-side dispatcher at 180s; the Windows Hermes child may outlive it up to its
own 600s) + `timeoutEnvelope` + `classifyRetry` fail-path retry (A5 branch) /
CLAIM: the branch resolves timeout ambiguity as honest-failed + bounded
fail-path retry (at-least-once exterior execution); this is LIVE-proven for the
no-output case but leaves two unclassified residuals / EVIDENCE: LIVE (TEST-A6
attempt-2 = matrix case T1/T4: no output -> honest WORKER_FAILED -> escalate) +
TEST (synthetic t_timeout_after_effect: post-boundary -> OUTCOME_UNKNOWN not
requeued; pre-boundary control -> FAILED requeueable — the W2 semantics, proven
in harness, NOT wired into the branch loop) + STATIC (SIGKILL does not reach
the Windows child; the late drop is attemptId-scoped and orphaned after
`last_attempt_id` is nulled) / CALLER: `delegate` / CALLEE: `timeoutEnvelope`,
`orcaPolicy.classifyRetry` / WRITER: loop (honest envelope, attempt outcomes) /
READER: auditors / AUTHORITY: coordinator (timeout declaration) / CLASSIFICATION:
ORCA STRONGER→HARVEST / CONFIDENCE: high for the mechanism; medium for the
residuals (static only) / BROKEN BOUNDARY: T2/T3 below have no UNKNOWN
classification in the branch / DEPENDENCIES: H5, H7 / AFFECTS AGENTS: orca-b,
w2-impl-state, w2-missions.
HARVEST: H7 — honest coordinator-constructed failed envelope (labeled "not
worker output", "no success fabricated") + `classifyRetry` with failureKind +
bounded attempts (MAX_ATTEMPTS=2, max 2 work orders per run); REQUIRED
COMPLETION: H5 (OUTCOME_UNKNOWN + unknown-blocked set) for the T2/T3 residuals.

### Timeout-after-effect matrix (branch behavior, `feature/orca-autonomy`)

| Case | Worker actually… | Coordinator records | Fail-path retry? | Canonical events | Residual |
|---|---|---|---|---|---|
| T1 | never ran / died silently | WORKER_FAILED (timeout envelope) | attempt+1, bounded | 1 FAILED | none — LIVE-proven (TEST-A6 attempt-2) |
| T2 | completed before 180s; drop written before SIGKILL landed | WORKER_FAILED (timeout envelope; the collected rendezvous is ignored on the timeout path) | attempt+1 | WORKER_FAILED only | effect recorded as failed; retry duplicates exterior execution |
| T3 | still running at 180s (orphan), completes later, writes late drop | WORKER_FAILED (timeout envelope); late drop orphaned permanently | attempt+1 | WORKER_FAILED (attempt N), then attempt N+1's event | double exterior execution; late result unrecoverable |
| T4 | still running, never completes | WORKER_FAILED (timeout envelope) | attempt+1 | WORKER_FAILED | wasted retry only — LIVE-proven pattern |

The branch's choice is at-least-once with honest attempt records. The W2 spec
(H5) reclassifies T2/T3 as OUTCOME_UNKNOWN (never auto-requeued, never marked
success) — synthetic-proven, awaiting branch wiring.

## Verdict table

| # | Mechanism | Verdict | Evidence | Confidence |
|---|---|---|---|---|
| 1 | checkpointing | ORCA STRONGER→HARVEST (H1) | TEST | high |
| 2 | resume after death | ORCA STRONGER→HARVEST (H2) | LIVE (TEST-A6) | high |
| 3 | reconcileStartup | ORCA STRONGER→HARVEST (H2) | LIVE (TEST-A6) | high |
| 4 | dependency graphs | ORCA STRONGER→HARVEST (H4, W2 query) | TEST | high |
| 5 | ready-set queries | ORCA STRONGER→HARVEST (H4) | TEST | high |
| 6 | successor work / follow-up | PATTERN ONLY | STATIC + LIVE-adjacent (A5) | med-high |
| 7 | blocked-work model | ORCA STRONGER→HARVEST (H5) | TEST + synthetic | high (spec) |
| 8 | worker death | ORCA STRONGER→HARVEST (H2) | LIVE (TEST-A6) | high |
| 9 | coordinator death | ORCA STRONGER→HARVEST (H3) | LIVE + TEST | high |
| 10 | duplicate completion | PING STRONGER (H6) | STATIC + TEST | high |
| 11 | stale completion | UNKNOWN→INVESTIGATE | STATIC | medium |
| 12 | late completion | PATTERN ONLY | LIVE + TEST + STATIC | med-high |
| 13 | effect-before-ack | ORCA STRONGER→HARVEST (H2/H6) | STATIC + LIVE-adjacent | high |
| 14 | ack-before-effect | EQUIVALENT | STATIC | high |
| 15 | timeout-after-effect | ORCA STRONGER→HARVEST (H7+H5) | LIVE + TEST + STATIC | high (mech) / med (residuals) |

Counts: ORCA STRONGER→HARVEST 10 | PING STRONGER 1 | EQUIVALENT 1 |
PATTERN ONLY 2 | UNKNOWN→INVESTIGATE 1 | REJECT 0 | NOT APPLICABLE 0.

## Prior-claim challenges

**C1 — A5 verdict (`wave1/orca-arch/A5-VERDICT.md`): SURVIVES.** All three
claims' source mechanisms re-verified in this lane (adapter gate, delegate
attempt loop with attempt-before-dispatch, assessAndFollowUp causation linkage).
No falsification found. Strengthened: the verdict's open item — "A6 restart
resilience implemented but witnessed re-proof pending" — is now witnessed-fixed
by TEST-A6. Refinement: the A5 timeout-to-retry proof (run `orca-run-mu6x9eeh`)
demonstrated matrix case T1 only; T2/T3 were outside its witnessed scope.

**C2 — GAPS.md (`wave1/spine-exec/GAPS.md`): GAP 5 SURVIVES, now TEST-PROVEN.**
`probes/hung-worker-harness.js` runs the REAL mainline `mission_scheduler.js` +
`mission_runtime.js` (read-only copies @ cc6856c3) against an in-memory PG-shape
fake: 3 hung workers -> 24 lease renewals (Arrow 0, every 200ms poll), 10 reap
calls reclaiming 0, `_processing.size` = 3, 4th mission stuck `created` forever,
all hung leases ~60s in the future. The causal chain is mechanical: no timeout
in `WorkerRuntime.dispatch` or `MissionScheduler._dispatch` + Arrow 0 renews
before Arrow 1 reaps + the reaper only catches expired leases. This answers
Agent 19's C2 attack-plan question directly: demonstrated, not speculative.
GAPs 3 (bare-counter retries, no attempt records), 4 (no checkpoints), 6 (no
dependency graph) re-confirmed STATIC. GAP 10's "recordVerifiedResult does not
exist in source" holds for mainline scope (the function lives on the A5 branch
only; `ping-runtime/external-agent/` is absent at cc6856c3) — accurate as scoped.

**W2-MISSIONS INTERRUPTION-DRILL.md D2: WEAKENED in one sub-expectation,
otherwise consistent.** The drill's G1-G6 PASSED in the witnessed run. But
expectation (b) — "reconcile via the atomic rendezvous result file if the
worker finished, or mark it unknown and NOT re-delegate blindly" — does not
describe branch behavior: the witnessed reconcile classified attempt-1
DISPATCH_LOST (dispatcher dead + no rendezvous = treated as known-lost) and
re-authorized it as NEW attempt-2 within budget. That is bounded, not blind,
but it IS re-delegation, and the branch has no UNKNOWN classification in
either state machine to mark it with. The drill's (b) is satisfiable by the
W2-IMPL-STATE spec (OUTCOME_UNKNOWN + blocked set, synthetic-proven), not by
the current branch loop. Two gaps for the drill owner: (i) wire H5 into the
loop, or amend (b) to the branch's actual bounded re-delegation semantics;
(ii) the drill's "exactly-once delegation (no duplicate work_order_id)" holds
at delegation-identity level (stable id, cached COMPLETED, RUNNING refusal)
but execution is at-least-once (matrix T3) — the drill text should distinguish
delegation identity from execution identity.

## Open UNKNOWNs

- U1: T2/T3 live race (orphaned Windows Hermes child completing after the
  coordinator's timeout classification). Static only. Needs a Pig Windows
  timing experiment; the gauntlet's "worker hang is environmental" note suggests
  the harness, not the branch, is the right place to stage it.
- U2: `pidAlive` PID-reuse false positive across WSL reboot (static-noted).
  A dead dispatcher's recycled PID reads "alive" -> work order left RUNNING,
  delegate refuses redispatch -> stall (not corruption).
- U3: stale rendezvous drop collection across same-objective reruns (record 11).
  Missing timestamp guard; no live occurrence observed.
- U4: drill D2 expectation (b) vs branch behavior — needs the drill owner's
  decision (wire H5 or amend the drill).

## Failure pipeline log (this lane)

- Two `pigwsl-run.sh` session-metadata timeouts ("failed to store metadata …
  timed out after 15s"): LOCAL ACCIDENT (infra flake), recovered on retry, no
  state lost. No requeue.
- Harness build: wrong `module.exports` shape + missing `getActive` in the
  fake pool: LOCAL ACCIDENT (my scaffolding), fixed, harness green. No requeue.
- No generic classes found; no memory candidates beyond what is already
  recorded in this file.

## Follow-on queue (parent-ordered)

1. timeout-after-effect matrix — DONE (record 15, matrix T1-T4 above).
2. unknown-execution classification — SPEC DONE (H5, synthetic-proven);
   branch wiring is the open work (route to W2-IMPL-STATE / parent).
3. branch movement probes — NOT STARTED; branch tip verified `ae55b77ff`
   during this lane's reads.
4. cross-check vs Agent 19's falsification log — their C2 attack question
   ("demonstrate or speculative?") is answered by `probes/hung-worker-harness.js`
   (TEST-PROVEN); their re-proof challenge is answered by TEST-A6 (LIVE).
   Recommend they read records 3, 8, 15 and the drill challenge above.

## Probes and artifacts (this lane)

- [VERDICTS.md](sandbox://workspace/orca-finish/program/orca-b/VERDICTS.md) (this file)
- [CHECKPOINT.md](sandbox://workspace/orca-finish/program/orca-b/CHECKPOINT.md)
- `probes/hung-worker-harness.js` — real mainline scheduler+runtime, fake
  PG-shape pool, hung vs fast worker; proves the C2 slot-leak (24 renewals,
  0 reaps, permanent stall at maxConcurrent=3).
- `probes/vendor/` — read-only copies of the two mainline modules + a
  `constitutional_time_authority` stub (the only fake besides the pool/worker).
