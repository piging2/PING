#!/bin/bash
# v1.2.0 smoke: 2 jobs, verify new metrics fields + dispatch attempt accounting.
H=/home/nolan/fyd-compile-harness
SMOKE="$H/queue-smoke"
mkdir -p "$SMOKE"
node "$H/runner/enqueue.js" \
  --fixtures-dir /home/nolan/fyd-compile-harness/fixtures/pilot-fixtures \
  --pig-fixtures-dir /home/nolan/fyd-compile-harness/fixtures/pilot-fixtures \
  --seeds 99 \
  --out "$SMOKE/manifest.jsonl" <<'EOF'
EOF
# enqueue takes all fixtures; limit to 2 jobs via MAX_JOBS
head -2 "$SMOKE/manifest.jsonl" > "$SMOKE/manifest2.jsonl" && mv "$SMOKE/manifest2.jsonl" "$SMOKE/manifest.jsonl"
rm -rf "$H/results-smoke" && mkdir -p "$H/results-smoke"
rm -f "$H/results-smoke.jsonl"
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/queue-runner.ts" \
  --manifest "$SMOKE/manifest.jsonl" \
  --results-dir "$H/results-smoke" \
  --results-jsonl "$H/results-smoke.jsonl" \
  --runner-dir "$H/runner" \
  --job-timeout-ms 60000 \
  --concurrency 1 \
  --batch-size 5 \
  --stall-ms 0
echo "EXIT: $?"
echo "=== result fields ==="
python3 -c "
import json, glob
for f in sorted(glob.glob('$H/results-smoke/*.json')):
    r = json.load(open(f))
    print({k: r[k] for k in ('outcome','harness_version','attempts','stage_ms','peak_memory_bytes','input_unsafe_url_count','unsafe_url_count','dispatch_seq')})
    print('  has peak_rss_bytes:', 'peak_rss_bytes' in r)
"
echo "=== manifest ==="
python3 -c "
import json
for line in open('$SMOKE/manifest.jsonl'):
    r = json.loads(line)
    print({k: r[k] for k in ('status','attempts','quarantined','publish_seq','done_seq')})
"
