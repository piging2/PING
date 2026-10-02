# IMPL LANE NOTE — FC-4: pool-contention wedge (hold-and-wait deadlock)

**Class:** GENERIC (implementation-independent) | **Lane:** CHAOS-B Q2
**Fixture:** `fixtures/fc4-pool-contention-deadlock.py` (exits 0: WEDGED then HEALED)
**Evidence:** `evidence/probe-records.jsonl`, DOMAIN `chaos.pool-exhaustion` — 12 records:
q2a 3/3 SURVIVED (16/16 units, p99 acquire 2.1–2.8s), q2b 3/3 WEDGED
(0/16 completed, 16 threads stuck, 25s watchdog), q2b-control 3/3 SURVIVED
(16/16 on a 32-conn pool: the units are correct, the 2-conn pool wedges),
q2c 3/3 SURVIVED via the fix direction.

## The failure
16 concurrent tx units against a fixed 2-connection pool. Each unit is
correct and retry-armed (bounded retry, backoff). Each unit borrows one
connection, does work, then needs a second connection (nested borrow, e.g.
audit write) with a *blocking* acquire and no deadline. Two units end up
each holding one connection and blocking forever on the nested borrow;
the other 14 block on the first borrow. Result: zero progress, no error,
no crash. The wedge is silent and sits *beneath* the retry loop, so bounded
retry never fires. This is the textbook hold-and-wait deadlock, and it does
not need a faulty unit: unbounded concurrency against a fixed pool is
sufficient.

## Why it is not FC-2
FC-2 (outage lane) wedges when the DB disappears and nothing retries; its
fix is bounded retry with backoff. FC-4 wedges with a *healthy* DB while
bounded retry is present; retry cannot fix a structural deadlock. Different
trigger, different fix, same symptom (silent zero progress). Grade: FC-2
stays single-lane (outage); FC-4 is the new contention-lane class.

## Fix class (in priority order)
3. **Never hold-while-acquiring** — THE fix, load-bearing: restructure to
   single-borrow units (audit write on the same connection/transaction),
   or acquire all borrows up front. Proven: 16/16 in 2s on the same
   2-connection pool (`probes/exp_convergence.py`).
1. **Acquire deadlines everywhere**: every pool borrow takes a timeout and
   raises a typed escape (PoolTimeout), never blocks indefinitely.
2. **Release-before-retry**: on PoolTimeout, roll back, release every held
   connection, back off, then retry the whole unit bounded.
   (1)+(2) are mitigation, not cure: q2c (deadline 1.5s + jittered retry)
   healed only 1–2/16 in 25s, and deadline + *exponential* backoff over 30
   attempts completed 0/16 in 150s — the retry churn is self-sustaining
   (near-livelock). Do not ship (1)+(2) as the fix for hold-and-wait.

What is NOT the fix: raising the retry budget (the wedge is beneath it),
or enlarging the pool (moves the cliff, keeps the deadlock shape).

## Regression test
Run the fixture in CI: it must print WEDGED (blocking nested borrow),
DEGRADED (deadline+retry alone does not heal severe contention), and HEALED
(restructured single-borrow unit). Any pool implementation where a unit can
block indefinitely on acquire while holding a connection fails this
fixture; any fix claim based on retry/backoff tuning alone fails the
DEGRADED act.

## Detection in production
Stuck-progress detector: units that hold a connection longer than N x p99
acquire latency with zero completions across the pool signal FC-4, not
slowness. Alert on (pool saturation == 100%) AND (completion rate == 0).
