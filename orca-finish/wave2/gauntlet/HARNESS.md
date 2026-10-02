# ORCA Recovery Gauntlet — Harness (Wave 2, ORCA-FINISH)

Witnessed chaos-test harness for the ORCA recovery gauntlet (mechanism-map record 21,
status PATTERN_ONLY). It exercises the durable-execution mechanics (records 1, 6, 7, 8,
10, 13, 14, 15, 17) under injected faults, graded from durable state. It never converts
an unknown outcome into success.

## 1. Safety boundaries (hard rules)

1. **Scratch database only.** All chaos runs use the `ping_gauntlet` database in the
   `ping-gauntlet-pg` container. No test ever connects to a production database.
2. **Non-production ports only.** The scratch database binds to host port **54339**
   (loopback). No harness process listens on or connects to production ports
   (8080, 3100, 5432, 5433, 6379, 18099, 15433, 55433, or any discovered website port).
3. **Kill scope.** SIGKILL/SIGTERM are delivered only to harness-spawned worker and
   coordinator processes (tracked PIDs), never to production processes.
4. **DB outage test scope.** `t_db_disappear` stops ONLY the `ping-gauntlet-pg`
   container and refuses to run while an A6 re-proof loop is active (pgrep gate).
5. **Live site untouched.** No chaos traffic touches the PING website or gateway.
   One documented exception: the real A6 loop's `observe()` performs a read-only
   HTTP GET to `127.0.0.1:8080/health` in a try/catch (pre-existing loop behavior,
   no mutation, logged as a caveat in GAUNTLET-RESULTS.md).
6. **No fabricated verdicts.** Every test verdict is computed from durable scratch
   state by the test itself or the grader. A test that cannot establish its evidence
   FAILs or reports NOT-RUN with the exact blocker.

## 2. Isolation proof

Discovered on the Pig 2026-09-24 ~01:35 UTC (production/pre-existing state,
recorded read-only):

| Container / service | Port(s) |
|---|---|
| ping-gateway | 8080 |
| ping-postgres | host 5433 |
| ping-redis | 6379 |
| PING website | 3100 |
| other websites | 3101, 3210 |
| ping-rc-gateway | loopback 18099 |
| ping-rc-postgres | loopback 15433 |
| ping-test-pg | 55433 |
| brain-postgres | 5432 |

Discovered database names (production): `crx_runtime`, `lanea_gate`, `ping_runtime`,
`h13_approvals`, `h13_dur`, `h13_effect`, `h13_social`, `collmu99638e`, `crx`,
`rc_staging`, `ping-fyd-demo`, `pingtest`, `postgres`.

Scratch infrastructure (created for this gauntlet, non-production):

| Item | Value |
|---|---|
| Container | `ping-gauntlet-pg` (`postgres:17-alpine`) |
| Host binding | `127.0.0.1:54339 -> 5432` (loopback only, Docker-verified) |
| Database | `ping_gauntlet` |
| Role | `gauntlet` |
| Password | `/home/nolan/.gauntlet-pg-pass` (mode 600, Pig-local) |
| Python venv | `/home/nolan/gauntlet-venv` (psycopg 3.3.6) |
| Node deps | `/home/nolan/gauntlet-node` (`pg`) |
| Worktree | `/home/nolan/ping-gauntlet`, branch `orca-finish/gauntlet`, base `cc6856c3` |
| Harness dir | `/home/nolan/ping-gauntlet/orca-gauntlet/` |

Isolation queries against the scratch database (2026-09-24):

- `current_database() = ping_gauntlet`
- Databases inside the scratch container: `['ping_gauntlet', 'postgres']`
- Intersection with all discovered production database names: **NONE**
- Docker port proof: `5432/tcp -> 127.0.0.1:54339`

Phase 1 note: a distinct non-production test *gateway* process was not started;
the synthetic suite needs no gateway (its "coordinator" is an in-test process),
and the A6 re-proof reuses the real control loop pointed at scratch via
`PGPORT=54339`/`PGDATABASE=ping_gauntlet` (with the documented read-only
`:8080/health` observation exception). A standalone scratch gateway remains
unbuilt; it is not required for any test in this gauntlet.

## 3. Scratch schema

`/home/nolan/ping-gauntlet/orca-gauntlet/schema.sql` creates schema `gauntlet`
with 7 tables (verified: 7/7 present):

- `runs` — durable run records (run_id, status, prompt_ref, branch)
- `packets` — durable work packets with atomic claim columns
  (`status`, `claimed_by`, `claimed_at`, `attempt_seq`, `result_ref`, `lease_*`)
- `checkpoints` — monotonic checkpoints with sha256 digests
- `tool_calls` — side-effect boundary: submit/ack/timeout with
  `OUTCOME_UNKNOWN`, idempotency keys, evidence text
- `leases` — fencing leases (holder, expiry, TTL)
- `coordinator_epoch` — fencing tokens; stale-epoch writes are rejected
- `audit_events` — append-only evidence log (run-scoped)

The real A6 loop additionally uses PING's own scratch tables `ping_events`
and `ping_missions` inside `ping_gauntlet` (created by the loop's pre-init).

## 4. Harness components

All in `/home/nolan/ping-gauntlet/orca-gauntlet/` (committed on branch
`orca-finish/gauntlet`, never pushed):

| File | Role |
|---|---|
| `gauntlet_lib.py` | DB connector (scratch only), run/packet/claim/lease/epoch/checkpoint primitives, audit, side-effect boundary (`tool_submit`/`tool_ack`/`tool_timeout` with `OUTCOME_UNKNOWN`) |
| `worker.py` | Killable worker subprocess: claims a packet, performs N steps with heartbeats, writes checkpoints, exits 0 on completion / 2 on lease loss |
| `coord_proc.py` | Killable coordinator subprocess: holds a fencing epoch, rejects stale-epoch writes from dead coordinators |
| `run_suite.py` | Suite runner; writes `suite-results.json`; verdicts computed from evidence |
| `tests/t_*.py` | One file per chaos case; each returns `{"verdict", "evidence"}` |
| `test-a6-reproof.sh` | TEST-A6 orchestrator: launches real A6 loop on scratch, SIGKILLs run 1 mid-dispatch, relaunches run 2 |
| `grade-a6.py` | TEST-A6 grader: 6 gates checked against durable state and logs |

Mechanism coverage: atomic claims (record 1), fencing/epochs (record 6),
leases (record 7), checkpoints (record 10), `OUTCOME_UNKNOWN` no-fabrication
(record 8), append-only audit (record 13), no private controller state —
recovery reads durable state only (record 14), crash-recovery reconcile
(record 15), advisory-lock claims in the real loop (record 17).

## 5. Running

Synthetic suite (all 9 tests, ~15 s):

```bash
/home/nolan/gauntlet-venv/bin/python /home/nolan/ping-gauntlet/orca-gauntlet/run_suite.py
# single test:
/home/nolan/gauntlet-venv/bin/python /home/nolan/ping-gauntlet/orca-gauntlet/run_suite.py t_worker_death
```

TEST-A6 witnessed re-proof (~4 min; kills the real `feature/orca-autonomy` loop):

```bash
/home/nolan/ping-gauntlet/orca-gauntlet/test-a6-reproof.sh
# then grade:
/home/nolan/ping-gauntlet/orca-gauntlet/grade-a6.py /home/nolan/gauntlet-data/a6-reproof-<timestamp>Z
```

Results land in `suite-results.json` (synthetic) and the evidence directory
(A6: run logs, durable objective/work-order JSON, reconcile-startup.json,
dispatch/acceptance/verify artifacts, scratch `ping_events` rows).

## 6. Known harness bugs found and fixed

- `t_timeout_after_effect` counted idempotency rows across all runs (missing
  `run_id` filter): flaked PASS then FAIL across suite runs. Fixed by scoping
  the count to the test's own run. Lesson: every evidence query must be
  run-scoped, or repeated suite runs poison each other's evidence.
- The `gauntlet` schema was not applied before the first suite run (all 8 tests
  failed honestly with `UndefinedTable`); applied afterwards and verified 7/7
  tables before re-running. Lesson: verify schema presence as a pre-flight step.
