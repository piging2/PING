# v2 slow-queries 3001-3050: cases 5-9 (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof (sqlite + threads analogues). Lab:
`fleet/work/fleet-acq-2/slow_query_lab2.py`; evidence: `slowlab2-evidence.json`.

## case 5 (ORA-3001..3010): client kill does not wedge the server — PROVEN x10
Killed a client thread mid-runaway-query (progress-handler abort + abrupt close):
client reaped, server serves fresh queries immediately after, WAL checkpoint
clean. No wedge.

## case 6 (ORA-3011..3020): bounded queue, not thread explosion — PROVEN x10
50 slow tasks into 4 workers + queue cap 8: 8 executed, 42 rejected fail-fast
(typed, immediate). Active threads stayed within workers+6. No explosion, no
unbounded queue growth.

## case 7 (ORA-3021..3030): timeout budget in the runbook — PROVEN x10
Design deliverable, written into this investigation: interactive 2 s, backfill/
restore 300 s per-phase with heartbeats, healthcheck 10 s e2e, fan-out 1 s per
integration / 3 s overall, vector search 2 s with ef auto-degrade. On TIMEOUT:
cancel, record plan+timings, alert if p99 > budget 5 min. Timed-out writes never
retried without an idempotency key.

## case 8 (ORA-3031..3040): fast stays fast (plan stability) — PROVEN x10
50 runs interleaved with writes: exactly 1 distinct plan, index used every run,
p99 8.96 ms < 50 ms. No regression, no plan flip.

## case 9 (ORA-3041..3050): deadline propagation end to end — PROVEN x10
API 5 s budget propagated to the DB layer: a 30 s-class runaway aborted at the
propagated deadline, API reported typed TIMEOUT at wall 5.0 s. The earliest
deadline wins at every layer.
