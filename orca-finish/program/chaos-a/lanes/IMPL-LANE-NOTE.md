# Lane note: confirmed generic failure classes from CHAOS-A

To: impl lanes (ORCA-B, CHAOS-B, and whoever builds the durable execution layer)
From: CHAOS-A (kill matrix + idempotency) | 2026-09-23 ~21:15 MDT
Re: three GENERIC classes, each with a runnable repro fixture. Not local
accidents. Each fixture exits 0 when the class reproduces.

## FC-1: crash-recovery without idempotent effect keys duplicates side effects
- Fixture: `program/chaos-a/fixtures/fc1-nonidempotent-recovery.py`
- Mechanism: effect application keyed nondeterministically (or not keyed);
  a crash mid-handle followed by a requeue re-applies already-applied
  effects. Proven: 1 effect before crash, 4 effect rows after naive requeue
  over 3 steps (step 1 applied twice).
- Fix: deterministic effect keys per (work unit, step) with INSERT-or-ignore
  semantics; checkpoint AFTER the effect apply. CHAOS-A's hardened path
  survived 12/12 crash probes with exactly-once effects.
- Applies to: any retry/recovery path that re-executes side-effecting steps.

## FC-2: no-retry-on-pool-drop wedges the loop
- Fixture: `program/chaos-a/fixtures/fc2-pool-drop-wedge.py`
- Mechanism: a single-attempt transactional unit raises on pool disappearance;
  with no bounded retry the loop makes zero progress until an operator heals
  the pool. Proven: 0 packets during outage, heal restores progress.
- Fix: bounded retry with backoff around transactional units (CHAOS-A used
  5 attempts; 4 concurrent threads healed through a 1s outage with zero
  duplicate claims). Retry budget must be explicit and finite.
- Applies to: every DB-touching loop; the wedge is silent (no crash, just
  no progress), so add a stuck-progress detector.

## FC-3: non-durable dispatch intent lost on pre-write coordinator death
- Fixture: `program/chaos-a/fixtures/fc3-nondurable-intent.py`
- Mechanism: the coordinator derives what to dispatch from private memory and
  dies before its first durable write. Recovery behaves correctly (lock freed,
  epoch bumped, zombie writes rejected, nothing stuck) and still the intended
  work silently never exists: 2 intended packets, 0 recovered.
- Fix direction proven by `probes/run_durable_intent.py` (3/3 SURVIVED): the
  planner enqueues dispatch intent durably BEFORE any coordinator reign; the
  next reign adopts it (epoch stamp) and workers claim normally. This is the
  "durable objective identity" half of the A6 fix: the objective must be
  durable before the coordinator acts, not after.
- Applies to: coordinator/planner split; any design where dispatch decisions
  live only in coordinator memory.

## What survived (use as regression bar)
- Kill at any of 9 dispatch stages (S1 pre-claim .. S7 post-complete), SIGKILL
  and SIGTERM: 39/39 probes, 78 missions, zero duplicate delegation,
  exactly-once completion. SIGTERM graceful path flushes a checkpoint and
  resumes cleanly.
- Coordinator death mid-dispatch / post-dispatch / mid-reconcile: 12/12
  recovered exactly once; epoch fencing rejected 100% of zombie writes;
  mid-reconcile kill followed by a second recover did not double-requeue.
- In-process worker exception: supervisor reaps (rc=99), journal records the
  reap, lease survives the crash; pre-boundary -> FAILED safe-requeue,
  post-boundary -> OUTCOME_UNKNOWN with idempotent resume. 12/12.
- DB kill mid-transaction: atomic rollback, zero torn rows; torn-checkpoint
  probe: pre-commit death leaves nothing, post-commit death leaves a
  digest-verified row.
- Idempotency: 10/10 duplicate-delivery races single-winner; 8 storms
  (1,200 deliveries) -> 8 packets, 1,192 dedup hits, zero double-apply;
  23/23 collision probes reject-and-preserve; 12/12 same-event-twice ->
  exactly one completion.

## Suggested regression tests for impl
Run the three fixtures in CI. Then re-run `probes/run_kill_matrix.py`,
`probes/run_coord_death.py`, `probes/run_durable_intent.py` against the real
implementation's equivalent seams; the probe scripts document the seams
(claim/effect/checkpoint/emit/reclaim/epoch-fence/adopt).
