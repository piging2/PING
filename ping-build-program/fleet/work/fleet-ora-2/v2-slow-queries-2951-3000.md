# v2 slow-queries 2951-3000 sandbox pass (fleet-ora-2, 2026-09-24)

## Live production finding (read-only, ping-core-01)
`SHOW statement_timeout;` -> 0 (disabled). `SHOW idle_in_transaction_session_timeout;` -> 0 (disabled).
The live postgres has NO deadline enforcement: any slow query can run unbounded today. This is the
headline gap for the whole family: every "statement_timeout enforced" criterion below is currently
FALSE in production.

## Sandbox execution (sqlite3 stand-in, 200k-row events table)
- Case 0 (deadline): progress-handler deadline at 50ms -> slow cross-join aborted at 50.1ms with typed
  `OperationalError: interrupted`. No unbounded run.
- Case 1 (no orphan): post-abort connection fully usable; 200000/200000 rows intact.
- Case 2 (p99 budget): 200 indexed point lookups: p50=0.006ms, p99=0.057ms (local budget evidence).
- Case 3 (evidence): EXPLAIN QUERY PLAN + timings recorded in sandbox/tree/slowq-evidence.txt
  (plan confirms the probe query is a genuine sequential SCAN).
- Case 4 (load): concurrent writers could not defeat the deadline — abort at 50.5ms, typed, under load.

## Per-subject mapping (10 subjects)
S1 event-table seq scan / S2 pg_dump under pgbench / S3 qdrant vector search ef tuning /
S4 qdrant upsert storm / S5 snapshot during query load / S6 gateway /health fan-out /
S7 pg_isready under connection pressure / S8 pgdata restore under time budget /
S9 67MB qdrant snapshot restore under time budget / S10 index build with concurrent writes.
The deadline+cancel+evidence pattern above applies to each; engine-specific timeouts
(postgres statement_timeout, qdrant request timeouts, gateway HTTP client timeouts) must be set
per subject on staging, then verified with the same abort/evidence procedure.

## Verdicts
All 50 ADAPT: deadline/cancel/no-orphan/p99/evidence pattern executed and proven sandbox-local;
production currently has statement_timeout=0 (verified), so the criteria are not met live.
Owner followup: set statement_timeout (recommend 30s) + idle_in_transaction_session_timeout
(recommend 5min) on ping-postgres, define per-query p99 budgets, re-run the abort drill per subject.
