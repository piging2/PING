#!/bin/bash
# run-shard.sh <shard> — SHARD-CDEF launcher (2026-09-23, SHARD-CDEF).
# Follows the proven resume-shard-b.sh v2 pattern: this script runs the runner
# in the FOREGROUND; the launching side holds the SSH channel open for the
# whole run via: wsl -- bash -c 'exec setsid /home/nolan/fyd-compile-harness/run-shard.sh <x>'
# (nohup/setsid detach through a closing SSH channel die silently on this Pig.)
X="$1"
if [ -z "$X" ]; then echo "usage: run-shard.sh <c|d|e|f>"; exit 2; fi
mkdir -p "/home/nolan/fyd-compile-harness/results-shard-${X}"
cd /home/nolan/projects/ping
exec node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json \
  /home/nolan/fyd-compile-harness/runner/queue-runner.ts \
  --manifest "/home/nolan/fyd-compile-harness/queue-shard-${X}/manifest.jsonl" \
  --results-dir "/home/nolan/fyd-compile-harness/results-shard-${X}" \
  --results-jsonl "/home/nolan/fyd-compile-harness/results-shard-${X}.jsonl" \
  --runner-dir /home/nolan/fyd-compile-harness/runner \
  --job-timeout-ms 120000 --concurrency 1 --batch-size 10 --stall-ms 2000 \
  >> "/home/nolan/fyd-compile-harness/shard-${X}.log" 2>&1 < /dev/null
