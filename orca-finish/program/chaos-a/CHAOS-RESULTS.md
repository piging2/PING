# CHAOS-A: Kill Matrix + Idempotency - Certified Results

**Lane:** CHAOS-A | **Assignment:** ORCA FINISH PROGRAM - CHAOS-A
**Isolation:** proven 2026-09-23 20:14 MDT (ISOLATION_PROVEN; DB path inside
scratch, zero banned production identifiers, socket-monkeypatched mini-pass,
strace audit of all writes). No production system touched; no shared branch
committed. File-backed SQLite behavioral re-proof after the W2 gauntlet was
found Pig-bound and unrunnable on the Hatch host.
**Certified:** 2026-09-23 ~21:20 MDT | **Ledger:** `evidence/probe-records.jsonl`

## 1. Verdict summary (certified)

180 valid probe records (186 raw, 6 superseded - section 6). 1,531 logical
missions (quota 1,500; the 31 overage is documented spend on genuine
uncertainty: collision re-runs, durable-intent proof, recover re-verify).

| Verdict     | Records | Meaning |
|-------------|---------|---------|
| SURVIVED    | 164     | mechanism held under the kill/drop/dupe |
| WEDGED      | 7       | FC-2: single-attempt loop made zero progress during pool outage |
| LOST-STATE  | 6       | FC-3: non-durable dispatch intent lost on pre-write coordinator death |
| DUPLICATED  | 3       | FC-1: deliberate counterfactual crash-recovery without idempotent keys |

Mean confidence 0.943 (min 0.85). Broken boundaries observed: reconnect
policy (7), coordinator recovery intent layer (6), idempotent effect
application (3).

## 2. Certified probe table

| Suite | Probes | Missions | Result |
|-------|--------|----------|--------|
| Kill matrix (`probes/run_kill_matrix.py`): 9 dispatch stages x 3 reps x {SIGKILL, SIGTERM}; 2 external kill modes; 2 graceful-term modes | 42 | 81 | 42/42 SURVIVED |
| Coordinator death (`probes/run_coord_death.py`): mid-claim / mid-dispatch / post-dispatch / mid-reconcile x kill x 3 reps | 18 | 36 | 12 SURVIVED, 6 LOST-STATE (FC-3) |
| Durable-intent follow-up (`probes/run_durable_intent.py`): durable plan + mid-claim death + adopt, 3 reps | 3 | 6 | 3/3 SURVIVED |
| Worker crash (`probes/run_worker_crash.py`): 12 stage/failure combos + 2 deliberate non-idempotent counterfactuals | 18 | 18 | 15 SURVIVED, 3 DUPLICATED (FC-1, expected) |
| DB disappearance (`probes/run_db_drop.py`): A mid-txn kill, B finite outage, C concurrent kill, D 2-wave, E heal-retry | 31 | 43 | 24 SURVIVED, 7 WEDGED (FC-2, expected) |
| Idempotency delivery races (`probes/run_idempotency.py`): 10 threads x 2 waves | 21 | 21 | 21/21 SURVIVED, single winner each |
| Idempotency storms: 8 storms (150 deliveries x 8) | 9 | 1,240 | 9/9 SURVIVED: 8 packets, 1,192 dedup hits, zero double-apply |
| Idempotency collisions: same key different payload, 12 reps x 2 (re-run after key-isolation fix) | 24 | 48 | 24/24 SURVIVED, first-writer preserved |
| Same-event-twice completion: 6 reps x 2 races | 13 | 39 | 13/13 SURVIVED, exactly one completion |

## 3. What survived (regression bar for impl)

- **Kill at any dispatch stage** (S1 pre-claim through S7 post-complete),
  SIGKILL and SIGTERM alike: 39/39 full-suite probes, 78 missions. Zero
  duplicate delegations, exactly-once completions. SIGTERM graceful path
  flushes a checkpoint and resumes cleanly.
- **Coordinator death mid-dispatch / post-dispatch / mid-reconcile:** 12/12
  recovered exactly once; epoch fencing rejected 100% of zombie writes from
  the dead reign; mid-reconcile kill followed by a second recovery did not
  double-requeue.
- **In-process worker exception:** supervisor reaps (rc=99), journal records
  the reap, lease survives the crash. Pre-boundary crash -> FAILED with safe
  requeue; post-boundary crash -> OUTCOME_UNKNOWN with explicit idempotent
  resume decision. 12/12 crash probes SURVIVED.
- **DB kill mid-transaction:** atomic rollback, zero torn rows, zero phantom
  packets. Torn-checkpoint probe: pre-commit death leaves nothing;
  post-commit death leaves a digest-verified checkpoint.
- **Duplicate delivery storms:** 1,200 concurrent deliveries -> 8 packets,
  1,192 dedup hits, zero double-apply. Collisions reject-and-preserve
  first-writer payload 24/24. Same-event-twice completion: exactly one,
  13/13.
- **FC-3 fix direction:** durable dispatch intent + next-reign adopt survives
  mid-claim coordinator death 3/3.

## 4. What did not survive (generic failure classes)

### FC-1: crash-recovery without idempotent effect keys duplicates effects
- 3 DUPLICATED (deliberate counterfactuals). Repro:
  `fixtures/fc1-nonidempotent-recovery.py` (exits 0 on reproduce: 4 effect
  rows for 3 steps).
- Fix: deterministic effect keys per (work unit, step), INSERT-or-ignore,
  checkpoint after the apply.

### FC-2: no-retry-on-pool-drop wedges the loop
- 7 WEDGED. Repro: `fixtures/fc2-pool-drop-wedge.py` (WEDGED then HEALED).
- Fix: bounded retry with backoff around transactional units; stuck-progress
  detector (the wedge is silent: no crash, just no progress).

### FC-3: non-durable dispatch intent lost on pre-write coordinator death
- 6 LOST-STATE. Repro: `fixtures/fc3-nondurable-intent.py`
  (intended=2, recovered=0).
- Recovery itself behaved correctly (lock freed, epoch bumped, zombie writes
  rejected, nothing stuck): the loss is at the intent layer, which never
  reached durable state. Fix direction proven 3/3: planner enqueues intent
  durably before any coordinator reign; the next reign adopts it
  (`probes/run_durable_intent.py`, `coord_proc --mode adopt`).
- This is the "durable objective identity" half of the A6 fix, with the why:
  without it, pre-write coordinator death loses work silently and
  unrecoverably.

## 5. Source-specific confidence limitations

The requested sources (`/home/nolan/worktrees/orca-autonomy` @ ae55b77ff,
`orca_run_record.js`, `orca_ready_set.js`) did not exist on the Hatch host;
the W2 gauntlet was Pig-bound (WSL paths, PG 127.0.0.1:54339, psycopg) and
unrunnable locally. CHAOS-A therefore re-proved the A6 mechanisms as a
file-backed SQLite behavioral harness implementing the same documented
semantics (durable runs/packets, atomic claims, monotonic digested
checkpoints, hashed expiring revocable leases, idempotent effect keys,
epoch-fenced coordinator reigns, write-once completions). Confidence 0.94 in
the failure CLASSES (they are implementation-independent); confidence that
the real implementation contains them is UNKNOWN until the source-specific
probes run. The Pig SSH path (`~/workspace/AGENTS.md`) remains the route to
copy the real sources into the scratch harness for that pass.

## 6. Superseded records (kept in the raw file, excluded from counts)

1. `probe-bef8c91f`, `probe-5e17019b` (chaos.worker-crash): pre-fix harness
   smoke; supervisor audited under run_id "unknown", recovery raced the
   OUTCOME_UNKNOWN status. Both harness bugs were fixed before the full run;
   superseded by the 14 full-run crash probes.
2. `probe-3e615e67` (idempotency.collision): LOCAL ACCIDENT, probe bug. The
   collision idem key `coll-0-0` was reused across the validation smoke and
   the full run; the dedup mechanism worked exactly as designed and deduped
   against the smoke's row. Fixed with per-invocation uuid keys; superseded
   by the 12 re-run collision probes (all SURVIVED).
3. `probe-1414030d`, `probe-47fd2735`, `probe-f411ccd8` (durable-intent):
   probe-harness syntax error in the `coord_proc --mode adopt` edit (fixed;
   `py_compile` clean; recover mode re-verified working). Superseded by the
   3 SURVIVED re-run probes.

## 7. Failure pipeline disposition

- **Local accidents** (3 items): #1 and #2 above plus the syntax error;
  all repaired, re-run, documented; none reached impl.
- **Generic classes** (FC-1, FC-2, FC-3): repro + fixture done; owning-lane
  note written (`lanes/IMPL-LANE-NOTE.md`); memory candidates below;
  requeued into `FOLLOWON-QUEUE.md` as done/closed with fixture paths.
- **Requeue**: higher-volume storms (10k deliveries), clock-skew races, pool
  exhaustion, slow-query probes are staged in FOLLOWON-QUEUE.md for CHAOS-B.

## 8. Memory candidates (for the parent agent to file)

- **MC-1 (FC-1):** crash recovery that re-executes steps must key effects
  deterministically per (work unit, step) with insert-or-ignore; checkpoint
  after the apply, never before. Counterexample: a checkpoint taken before
  the apply that is lost in the same crash double-applies.
- **MC-2 (FC-2):** a transactional loop with no bounded retry wedges
  silently on pool disappearance; the wedge emits no error, only absence of
  progress. Every DB-touching loop needs an explicit retry budget and a
  stuck-progress detector. Counterexample: infinite retry is not the fix;
  bounded with escalation is.
- **MC-3 (FC-3):** dispatch intent must be durable before the coordinator's
  first write, not after; a coordinator that dies pre-write loses private
  intent unrecoverably even when recovery is otherwise perfect. The adopt
  pattern (next reign stamps the epoch on pre-enqueued intent) is the proven
  shape. Counterexample: epoch fencing and locks protect reign transitions,
  not intent that never existed.
- **MC-4 (probe hygiene):** globally-unique idempotency keys must be unique
  per probe invocation (uuid suffix), or the mechanism under test will
  correctly dedupe against prior runs and the probe will misread it as a
  failure. Design hypothesis worth its own probe: cross-run key reuse is a
  real production aliasing hazard.
