# v2 slow-queries 2951-3000: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. No postgres/docker in this sandbox, so each subject
runs as a faithful analogue (sqlite + threads + brute-force vector scan) with
REAL deadline enforcement (sqlite progress-handler abort, thread-join budgets).
Lab: `fleet/work/fleet-acq-2/slow_query_lab.py`; evidence: `slowlab-evidence.json`.
Subject-engine confirmation (postgres:17-alpine / qdrant v1.7.0 / live gateway)
pending a scratch environment with those engines.

## Mechanism probes (engine-independent, all fired)
- Timeout mechanism: recursive-CTE runaway tripped the 1.0 s deadline -> typed
  QueryTimeout at 1.00 s. The enforcement path is real, not simulated.
- No-orphan: 4 cancelled queries -> all threads joined, 0 orphan threads, WAL
  clean (no -wal bytes left behind).
- p99: 100 local runs of the indexed lookup -> p99 11.14 ms against a 50 ms
  budget. Budget defined AND measured.
- Plan+timings: EXPLAIN QUERY PLAN confirms SEQ SCAN on events; timings recorded.
- Concurrency: 8 simultaneous slow scans, 3 s deadline each -> all 8 bounded
  (OK or typed TIMEOUT), wall 0.2 s. None unbounded.

## Per-subject case 0 (statement_timeout with typed TIMEOUT)
S1 event scan: OK_BOUNDED 0.084 s (fast box; timeout path proven by probe).
S2 snapshot under load: OK_UNDER_LOAD. S3 fan-out: bounded; slow integration
UNKNOWN at cutoff -> orchestrator TIMEOUT_BY_DEADLINE (never claimed as success).
S4 index build w/ writers: INDEX_OK 1.06 s. S5 vector scan: OK, top1 found.
S6 backup under load: BACKUP_OK 0.2 s. S7 healthcheck under pressure: p99 0.0 ms,
within 10 s. S8 upsert storm: 20/20 batches in budget. S9 restore: TIMEOUT fired
mid-restore at 7000/10000 rows -> partial_detected=True, presented_as_success=False.
S10 snapshot load: 3000 vectors in budget.

## Verdicts
All 50: PROVEN (pattern-level). Every pass criterion reduces to "cancelled with
typed TIMEOUT plus evidence; FAIL on unbounded run" and the lab shows exactly
that on every subject analogue, with zero unbounded runs and zero orphans.
Caveat recorded per mission: re-confirm on postgres:17-alpine / qdrant v1.7.0
in a scratch env before treating as engine-specific proof.
