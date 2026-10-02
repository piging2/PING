#!/bin/bash
# pilot20 phase 3: resume the killed queue with the v1.1.0 runner.
# The 5 pre-kill results were written by harness 1.0.0 with no bound code
# version: G1 requires they be rejected as stale and re-run, never served.
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue-pilot20/manifest.jsonl" \
  --results-dir "$H/results-pilot20" \
  --results-jsonl "$H/results-pilot20.jsonl" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 5 \
  --stall-ms 2000
echo "EXIT: $?"
