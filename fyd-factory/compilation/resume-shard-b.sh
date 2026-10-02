#!/bin/bash
# SHARD-B resume launcher v2 (2026-09-23 ~22:02 MDT, SHARD-B-VERIFY).
# v1 (setsid + & inside script, launching ssh session closed) died instantly:
# the detached child did not survive channel teardown, and wrote nothing.
# v2: script runs the runner in the FOREGROUND; the launcher invokes it as
#   wsl -- bash -c 'exec setsid /home/nolan/fyd-compile-harness/resume-shard-b.sh'
# so the runner lives in a new session AND the launching SSH channel stays
# open for the whole run (verified: exec setsid sleep 45 holds the channel).
# Kill/resume is the harness normal mode (HARNESS.md section 8): stale lock
# takeover + idempotent pre-check adopt the 40 completed results.
cd /home/nolan/projects/ping
exec node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json \
  /home/nolan/fyd-compile-harness/runner/queue-runner.ts \
  --manifest /home/nolan/fyd-compile-harness/queue-shard-b/manifest.jsonl \
  --results-dir /home/nolan/fyd-compile-harness/results-shard-b \
  --results-jsonl /home/nolan/fyd-compile-harness/results-shard-b.jsonl \
  --runner-dir /home/nolan/fyd-compile-harness/runner \
  --job-timeout-ms 120000 --concurrency 1 --batch-size 10 --stall-ms 2000 \
  >> /home/nolan/fyd-compile-harness/shard-b.log 2>&1 < /dev/null
