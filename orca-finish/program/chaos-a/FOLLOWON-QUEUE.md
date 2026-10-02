# CHAOS-A — Follow-on Queue

Staged by the CHAOS-A lane per task orders. Each item becomes a probe batch
when CHAOS-A's current scope completes. Never report-and-wait: the lane
pulls the next item when the current one is done.

## Q1 — clock-skew races
Lease expiry, fencing-token freshness, and checkpoint recency all assume a
single clock. Probes: skew the worker's clock +/- 60s vs the store clock;
assert a skewed worker cannot (a) extend an expired lease, (b) resurrect a
revoked lease, (c) win a claim with a stale fencing token. Expect at least
one LOST-STATE or DUPLICATED finding around lease-expiry races; the fix
class is "monotonic-clock + server-issued timestamps".

## Q2 — pool exhaustion
FlakyPool with max 2 connections; 16 concurrent tx units with bounded retry.
Measure: heal rate, p99 acquisition latency, deadlock/wedge rate. The
failure class to confirm: "unbounded concurrency against a fixed pool
wedges under contention even though each unit is correct".

## Q3 — slow-query behavior
Inject 2-5s latency into commit and checkpoint writes (not failure, just
slow). Probes: kill -TERM mid-slow-commit; SIGKILL mid-slow-checkpoint.
Question: does the slow path create NEW torn-state windows (e.g., the
supervisor's timeout fires while the commit is still in flight, causing a
double-recovery)?

## Q4 — redelivery storms at higher volume
10k duplicate deliveries against one idempotency key, 64 threads; then 1k
distinct keys x 10 duplicates. Measure dedup-hit rate, p99 insert latency,
any UNIQUE-constraint race that slips a duplicate (expect zero; a nonzero
count is a P0 finding for the impl lanes).

## Q5 — feed confirmed generic classes to the impl lanes
For every GENERIC class CHAOS-A confirms (FC-1, FC-2, ...): repro fixture
under fixtures/, one-page lane note under lanes/, memory candidate with
problem/scope/evidence/mechanism/fix/test/version/applicability/
counterexample, and a requeue entry naming the owning lane. Impl lanes
consume fixtures as regression tests.

## Standing
- Scratch only; isolation proof re-runs before every new probe batch.
- Every probe emits the shared record format to evidence/probe-records.jsonl.
- Checkpoint appends every ~15 min during active probing.

## Disposition after full run (2026-09-23 ~21:20 MDT)

FC-1, FC-2, FC-3 are CLOSED for CHAOS-A: repro + fixture + lane note +
results doc all done. Q1-Q4 remain OPEN and staged for CHAOS-B in priority
order: Q2 (pool exhaustion, builds directly on FC-2), Q1 (clock-skew), Q3
(slow-query torn windows), Q4 (10k storms). New item Q5: cross-run
idempotency-key aliasing (same key reused across runs returns prior run's
work - observed as a probe local accident in probe-3e615e67; needs an
explicit design decision: run-scoped keys vs global keys with run binding).

## CHAOS-B requeue (2026-09-24, owning lane: impl-lane)
- RQ-B1 (FC-4): acquire deadlines + release-before-retry + never-hold-while-acquiring in every bounded pool; stuck-progress detector; adopt chaos-b/fixtures/fc4-pool-contention-deadlock.py.
- RQ-B2 (FC-5): lease expiry on the store clock only; extend binds holder+token; rotate bearer tokens per grant; adopt chaos-b/fixtures/fc5-clock-skew-lease.py.
- RQ-B3 (FC-6): deterministic idempotency keys on every externally visible effect; single-txn claim+effect where possible; load-bearing reaper for two-phase work; adopt chaos-b/fixtures/fc6-slow-path-recovery.py.
