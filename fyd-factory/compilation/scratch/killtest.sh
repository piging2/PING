#!/bin/bash
H=/home/nolan/fyd-compile-harness
mkdir -p "$H/queue-killtest" "$H/results-killtest"
rm -f "$H/queue-killtest/manifest.jsonl.lock"
# launcher: batch-size 10, 1.5s stall between batches -> kill lands mid-queue
cd /home/nolan/projects/ping
rm -f "$H/killtest.log" "$H/killtest.pid"
nohup node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$H/queue-killtest/manifest.jsonl" \
  --results-dir "$H/results-killtest" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 120000 \
  --concurrency 1 \
  --batch-size 10 \
  --stall-ms 1500 \
  > "$H/killtest.log" 2>&1 &
echo $! > "$H/killtest.pid"
echo "launched pid $(cat $H/killtest.pid)"
sleep 5
PID=$(cat "$H/killtest.pid")
echo "killing $PID"
kill -9 "$PID"
sleep 1
echo "--- manifest status after kill ---"
python3 -c "
import json
from collections import Counter
c=Counter()
for l in open('$H/queue-killtest/manifest.jsonl'):
    j=json.loads(l); c[j['status']]+=1
print(dict(c))
"
echo "--- results written: $(ls $H/results-killtest | wc -l) ---"
echo "--- lock present: $(ls $H/queue-killtest/*.lock 2>/dev/null || echo none) ---"
tail -5 "$H/killtest.log"
