#!/bin/bash
# pilot20 rerun phase 1: clean slate, run until first batch (5 results)
# lands, snapshot, then SIGKILL mid-queue during the --stall-ms window.
H=/home/nolan/fyd-compile-harness
rm -rf "$H/results-pilot20"
mkdir -p "$H/results-pilot20"
rm -f "$H/pilot20.log" "$H/pilot20.pid" "$H/queue-pilot20/manifest.jsonl.lock" "$H/results-pilot20.jsonl"
rm -f "$H/pilot20-prekill.sha256" "$H/pilot20-prekill.mtime"
cd /home/nolan/projects/ping
nohup node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue-pilot20/manifest.jsonl" \
  --results-dir "$H/results-pilot20" \
  --results-jsonl "$H/results-pilot20.jsonl" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 5 \
  --stall-ms 10000 \
  > "$H/pilot20.log" 2>&1 &
echo $! > "$H/pilot20.pid"
echo "runner pid $(cat $H/pilot20.pid)"
