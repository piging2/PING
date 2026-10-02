#!/bin/bash
H=/home/nolan/fyd-compile-harness
# fresh kill-test queue
rm -rf "$H/results-killtest"
mkdir -p "$H/results-killtest"
cd /home/nolan/projects/ping
rm -f "$H/killtest.log" "$H/killtest.pid" "$H/queue-killtest/manifest.jsonl.lock"
nohup node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue-killtest/manifest.jsonl" \
  --results-dir "$H/results-killtest" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 10 \
  --stall-ms 10000 \
  > "$H/killtest.log" 2>&1 &
echo $! > "$H/killtest.pid"
echo "runner pid $(cat $H/killtest.pid)"
sleep 3
echo "--- worker procs before kill ---"
pgrep -af "job-worker.ts" || echo "no worker yet"
PID=$(cat "$H/killtest.pid")
kill -9 "$PID"
echo "killed runner $PID"
sleep 1
echo "--- worker procs after kill (orphan check) ---"
pgrep -af "job-worker.ts" || echo "no worker running"
echo "--- manifest status ---"
python3 -c "
import json
from collections import Counter
c=Counter()
for l in open('$H/queue-killtest/manifest.jsonl'):
    j=json.loads(l); c[j['status']]+=1
print(dict(c))
"
echo "results so far: $(ls $H/results-killtest 2>/dev/null | wc -l)"
