# Supervisor termination pattern (2026-09-23 evening MDT)
- Twice tonight the local run_pass.sh supervisor died mid-wait while the Pig-side
  engage.js worker kept running:
  1. pid 119907 (pass fb-20260924-023039 / Pass 105 launch at 20:30:39) — dead by ~20:45,
     engage.js continued; stale fb-chrome.holder left behind, flock released.
  2. Pass 105's supervisor (per worker report) — "terminated mid-wait", Pig worker
     PID 3132 (started 20:31:46) still running with 63 intents UNKNOWN_EXECUTION.
- Likely cause: the cron harness terminating the worker mid-run (long passes run
  1.5-3h at 60-120s pacing). Not confirmed from this plane.
- Mitigations in place and VERIFIED present in run_pass.sh:
  - Orphaned-worker guard (lines 50-55): refuses to launch when a Pig-side
    fb-engage worker is already running (fb_worker_in_flight).
  - Orphaned-result reaping: next pass picks up the .result.json and reconciles.
- The local flock alone is NOT sufficient mutual exclusion (dies with the supervisor);
  the Pig-side process-name check is the real backstop. Any future local-only lock
  must be paired with the Pig-side check.
- Pass 104 (fb-20260923-233527): reconciled 18/18 likes, 0 violations.
- No checkpoint, warning, or login block on any pass tonight.
