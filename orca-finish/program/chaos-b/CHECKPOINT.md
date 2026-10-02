# CHAOS-B — Pool Exhaustion (Q2) + Clock-Skew Races (Q1) — CHECKPOINT LOG
Lane: CHAOS-B | Session: d03d9240-5ecc-48e6-ac44-46a106c34788 | Started: 2026-09-24 ~05:10 MDT
Queue: FOLLOWON-QUEUE.md Q2 (first), Q1, then Q3 only if Q1+Q2 fully closed. Q4/Q5 are CHAOS-C's.
Orders: scratch harnesses only; isolation proof before each new probe batch; never production. YOLO, no stopping conditions.

## Harness lineage
- Copied `chaos_lib.py` + `schema.sql` from chaos-a (DB_PATH auto-resolves to the chaos-b lane dir via HERE).
- Extensions appended (chaos-b only, same patterns): `BoundedPool` (fixed max_size, acquire with optional timeout -> PoolTimeout, p99 acquisition latency stats) and clock-skew lease ops: `lease_extend_naive` (trusts worker clock, bearer-token reassigns holder), `lease_extend_server` (server clock, holder+token bound), `lease_grant_server` (server-clock grant), `lease_simulate_expiry` (deterministic expiry injection), `apply_effect_holder` (lease-scoped external effect, holder-keyed).
- Banned-token scan: zero hits. No network in new code (threading + sqlite only).

## Isolation PROVEN (2026-09-24 ~05:12 MDT, Q2 batch)
- Ran isolation/isolation_check.py: ISOLATION_PROVEN, exit 0.
  1. DB path inside chaos-b: /home/hatch/workspace/orca-finish/program/chaos-b/harness/chaos.db
  2. Banned-token scan of harness source: zero hits.
  3. Socket-blocked smoke: full mini-pass + BoundedPool acquire/release + server-variant lease extend/expire-refuse/revoke, all with sockets blocked.
  4. strace file-touch audit: every written path inside the chaos-b lane dir.
- Cleared for Q2 probes.

## Log
- 05:10 — Lane dir created; harness copied and extended; isolation proof passed for Q2.
- 05:15 — Q2 probe runner written (q2a/q2b/q2c). Local accident: pooled
  sqlite conns need check_same_thread=False (fixed; one tainted record
  discarded, file restarted).
- 05:25 — Q1 runner written. Local accident: q1c forgot the re-stamp at the
  new epoch (fixed, re-ran; old record superseded). Deeper catch: q1d-naive
  first recorded DUPLICATED without the extend being accepted (grant had
  rotated the token; probe applied both effects unconditionally). Fixed
  honestly: added lease_grant_naive (lease-scoped, non-rotating token) and
  gated effect application on store-accepted actions only. Old q1d-naive
  record superseded; re-ran with causal chain intact (a_extend_accepted=true,
  holder flipped to A, 2 effects).
- Q1 closed: 8 valid records (1 LOST-STATE q1a-naive, 1 DUPLICATED q1d-naive,
  6 SURVIVED), 2 superseded probe-bug records kept raw.
- Q2: q2a 3/3 SURVIVED (16/16, p99 2.1-2.8s); q2b 3/3 WEDGED (0/16, 16 stuck);
  q2b-control 3/3 SURVIVED (16/16 on 32-conn pool); q2c running (heal).
- Fixtures written: fc4-pool-contention-deadlock.py, fc5-clock-skew-lease.py.
  Lane notes: lanes/FC-4-pool-contention.md, lanes/FC-5-clock-skew-lease.md.
- Next: verify fc4 fixture, write CHAOS-RESULTS.md, memory candidates,
  requeue entries. Q3 only after Q1+Q2 fully closed.
- Q2 CLOSED: 12 records / 192 missions. q2c final: 3/3 WEDGED, heal rate
  0.06-0.125, ~185 PoolTimeouts/rep: deadline+jittered-retry does NOT heal
  16:2 contention. Convergence experiment (probes/exp_convergence.py):
  deadline + exponential backoff x30 attempts = 0/16 in 150s (self-sustaining
  retry churn, near-livelock); restructured single-borrow unit = 16/16 in 2s.
  Fix priority for FC-4: never-hold-while-acquiring is THE fix (load-bearing);
  deadlines + release-retry are mitigation only. Lane note + CHAOS-RESULTS.md
  updated to the honest finding.
- fc4 fixture rewritten as 3 acts (WEDGED / DEGRADED / HEALED); first run
  caught a fixture bug (tracked() wrapper dropped self -> TypeError killed all
  threads); fixed; now exits 0 with WEDGED(0/16,16 stuck), DEGRADED(0/16),
  HEALED(16/16).
- Isolation re-proven (wording fixed: chaos-b dir), then Q3 started per queue
  priority (Q1+Q2 fully closed with repro+fixture+lane note+results doc).
  Q3 runner: probes/run_slow_query.py (q3a supervisor-timeout double-recovery
  naive/fixed; q3b real SIGKILL mid-commit single/split/reaper/no-reaper;
  q3c SIGKILL mid-checkpoint outbox naive/fixed). Local accident: runner
  imported emit from record.py which only exports record(); added an emit()
  adapter matching the shared format. Early Q3a: naive 3/3 DUPLICATED,
  fixed SURVIVED so far.
- Q3 CLOSED: 21 records / 75 missions, all as designed. q3a-naive 3/3
  DUPLICATED (supervisor 2s timeout vs 4s slow commit -> double-recovery),
  q3a-fixed 3/3 SURVIVED; q3b-single 3/3 SURVIVED (atomic rollback, no torn
  window); q3b-split+reaper 3/3 SURVIVED (orphan CLAIMED/0-effects reaped);
  q3b-split no-reaper 3/3 LOST-STATE; q3c-naive 3/3 DUPLICATED (row 5
  re-dispatched); q3c-fixed 3/3 SURVIVED (10/10 exactly once).
- New generic class FC-6 (slow-path recovery races): slowness widens
  recovery windows ms->s, turning rare races into certainties. Fixture
  fc6-slow-path-recovery.py (6 acts) exits 0. Lane note
  lanes/FC-6-slow-path-recovery.md. CHAOS-RESULTS.md updated: 41 valid
  records (24 SURVIVED / 6 WEDGED / 4 LOST-STATE / 7 DUPLICATED), ~289
  missions; RQ-B3 + MC-B3 added.
- Q1, Q2, Q3 all CLOSED with repro + fixture + lane note + results doc.
  Q4/Q5 belong to CHAOS-C per user: not taken. CHAOS-B program complete.
