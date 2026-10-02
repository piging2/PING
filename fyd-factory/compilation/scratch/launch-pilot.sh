#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
rm -f "$H/queue/manifest.jsonl.lock" "$H/runner-pilot.log" "$H/runner.pid"
nohup node_modules/.bin/tsx "$H/runner/queue-runner.ts" \
  --manifest "$H/queue/manifest.jsonl" \
  --results-dir "$H/results" \
  --fixtures-dir "$H/fixtures" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  > "$H/runner-pilot.log" 2>&1 &
echo $! > "$H/runner.pid"
echo "launched pid $(cat $H/runner.pid)"
sleep 3
cat "$H/runner-pilot.log"
