#!/bin/bash
SSH="ssh -F /home/hatch/.ssh/pig-config pigwsl"
START=$(date +%s)
for i in $(seq 1 135); do
  sleep 20
  OUT=$($SSH 'wsl -- bash -c "wc -l < /home/nolan/fyd-compile-harness/results-shard-b.jsonl 2>/dev/null || echo 0"' 2>/dev/null)
  DRAINED=$($SSH 'wsl -- bash -c "grep -c queue.drained /home/nolan/fyd-compile-harness/shard-b.log 2>/dev/null || true"' 2>/dev/null)
  ELAPSED=$(( $(date +%s) - START ))
  echo "[elapsed=${ELAPSED}s] jsonl_lines=${OUT} drained_markers=${DRAINED}"
  if [ "$OUT" = "500" ] || [ "$DRAINED" != "0" ]; then
    echo "COMPLETE: jsonl_lines=${OUT} drained_markers=${DRAINED} elapsed=${ELAPSED}s"
    exit 0
  fi
done
echo "TIMEOUT after 45 min"
exit 1
