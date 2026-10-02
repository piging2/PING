#!/bin/bash
# Resume the killtest3 queue (40 jobs): 10 done with v1.0.0 results (stale
# code version -> G1 demotion + re-run), 30 pending. Expect 40 done, all
# v1.1.0 bound to the current pipeline_code_version.
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue-killtest/manifest.jsonl" \
  --results-dir "$H/results-killtest" \
  --results-jsonl "$H/results-killtest.jsonl" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 10 \
  --stall-ms 2000
echo "EXIT: $?"
