# ORCA-A CHECKPOINT — identity / claiming / leases / fencing verdicts

Started: 2026-09-23 ~20:05 MDT. Own dir: ~/workspace/orca-finish/program/orca-a/.

## 20:05 — kickoff
- Targets confirmed reachable (read-only) via pigwsl-run.sh:
  - A5 branch worktree /home/nolan/worktrees/orca-autonomy @ ae55b77ff82a893d50c48ab299117b2f705a0f03
  - ping-orca-state @ 30a750fad (branch orca-finish/state): orca/control-loop/orca_run_record.js + orca_ready_set.js
  - /home/nolan/ping @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (branch refactor/runtime-authority-convergence)
- Pulled read-only source copies into src/: objective-runtime.js (508 ln), orca_control_loop.js (1192 ln),
  orca_run_record.js (266 ln), orca_ready_set.js (104 ln), orca_status_model.js (178 ln), recovery_decisions.js (120 ln).
- Read so far: objective-runtime.js (full), orca_run_record.js (full). Next: orca_control_loop.js
  claim/reconcile sections, PING mission_runtime.js + mission_scheduler.js lease/claim code.

## 21:00 — verdicts delivered
- 57/57 executable probes pass (probe.js 43, probe2.js 14), scratch-only harnesses.
- VERDICTS.md written: 10 record blocks in shared format, summary table, 6 harvest specs (HS-1..HS-6), failure pipeline (2 local accidents), 2 open UNKNOWNs (U1, U2).
- Verdict counts: ORCA STRONGER->HARVEST 4 | PING STRONGER 2 | EQUIVALENT 2 | NOT APPLICABLE 1 | UNKNOWN 1 (carrying U1+U2).
- Key honest findings: ORCA fencing_epoch is detect-not-prevent (transitionRun/checkpointRun skip epoch checks); claimRun CAS provably loses updates under true concurrency (safe only via advisory-lock single writer); orca_run_record.js has ZERO production callers (shape proven, wiring not); PING hung-worker lease hole (GAP 5) and stale-worker ABA hazard both re-confirmed in current source; PING has no generation column and no scheduler single-writer claim.
- Repos untouched (read-only); no commits; no production contact.
