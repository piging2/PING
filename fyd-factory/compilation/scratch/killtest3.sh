#!/bin/bash
H=/home/nolan/fyd-compile-harness
rm -rf "$H/results-killtest"
mkdir -p "$H/results-killtest"
rm -f "$H/killtest.log" "$H/killtest.pid" "$H/queue-killtest/manifest.jsonl.lock"
cd /home/nolan/projects/ping
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
RPID=$(cat "$H/killtest.pid")
echo "runner pid $RPID; waiting for worker to appear..."
for i in $(seq 1 40); do
  if pgrep -f "job-worker.ts" > /dev/null; then
    echo "worker in flight at ${i}x0.25s; killing runner $RPID"
    kill -9 "$RPID"
    break
  fi
  sleep 0.25
done
sleep 4
echo "--- worker procs now ---"
pgrep -af "job-worker.ts" || echo "no worker running (orphan finished or never started)"
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
echo "--- last log lines ---"
tail -4 "$H/killtest.log"
