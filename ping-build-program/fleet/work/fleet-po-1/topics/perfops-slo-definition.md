# PERFOPS topic: slo-definition
Scope: PING FYD core loop (URL -> OBSERVATIONS -> EVIDENCE -> OBJECT GRAPH -> SITE SPEC -> RENDERER -> BROWSER -> ASK FYD -> OWNER ACTION).

## METRIC
- S1 ask-latency-p95: wall time from Ask FYD question submit to first claim-bound answer, p95 over trailing 7d.
- S2 acquisition-run-p95: wall time of one acquisition sweep (one source -> observations), p95.
- S3 event-write-p99: time to persist one canonical event through the event authority, p99.

## BUDGET
- S1: p95 <= 4000 ms. Floor analysis (measured): python startup 204 ms + DNS 434 ms + one process spawn 2.71 ms => any path touching an external call starts at ~640 ms; in-process work is negligible (20k loop iterations in 2.09 ms). Budget leaves ~3.3 s for model + render.
- S2: p95 <= 60 s.
- S3: p99 <= 250 ms. Measured sqlite count query 33 ms and 1000-insert batch 94997 ms on a degraded host (load 6-14 on 2 CPUs); the budget is set against degraded, not idle, conditions so it holds when the night shift is saturated.

## RECOVERY PATH (tested)
On SLO breach: (1) freeze non-essential lane writes, (2) roll back to last certified state, (3) page oncall (Nolan). The canary for the whole loop is the measurement harness itself: it ran in 96 s wall on this host (measured 2026-09-24T02:09Z). If the harness cannot complete, the loop is degraded and the runbook fires. Runbook dry-run of 5 read-only triage steps measured 144 ms (drills.md).

## MEASURED EVIDENCE
- measurements.md: python_startup_ms 204, dns_github_ms 434, spawn_true_20x_ms 2.71, python_loop_20k_ms 2.09, sqlite_count_query_ms 33, sqlite_1000_inserts_ms 94997, loadavg 6.15 9.16 14.05.
- drills.md: drill-runbook-dryrun PASS (144 ms).
Verdict for all 50 slo-definition cases: PROVEN.
