#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
rm -f "$H/runner-pilot2.log" "$H/runner.pid"
nohup node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue/manifest.jsonl" \
  --results-dir "$H/results" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 5 \
  > "$H/runner-pilot2.log" 2>&1 &
echo $! > "$H/runner.pid"
echo "launched pid $(cat $H/runner.pid)"
sleep 4
echo "--- log so far ---"
cat "$H/runner-pilot2.log"
