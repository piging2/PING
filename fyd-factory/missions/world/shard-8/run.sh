#!/bin/bash
# WORLD-SHARD-0 executor. Usage: run.sh [START] [END] [SSH_TIMEOUT]
# Streams RESULT lines from the Pig harness into results.jsonl incrementally.
SHARD_DIR="/home/hatch/workspace/fyd-factory/missions/world/shard-8"
START="${1:-0}"
END="${2:-500}"
SSHTO="${3:-1780}"
RESULTS="$SHARD_DIR/results.jsonl"
PROGLOG="$SHARD_DIR/run-progress.log"
STATS="$SHARD_DIR/run-stats.txt"
mkdir -p "$SHARD_DIR"
touch "$RESULTS" "$PROGLOG"
bash "$SHARD_DIR/gen-runner.sh" "$START" "$END" > /dev/null
echo "=== $(date -u +%FT%TZ) launching worlds [$START,$END) ===" >> "$PROGLOG"
~/workspace/bin/wsl-run.sh "$SHARD_DIR/_harness-body.sh" "$SSHTO" 2>>"$PROGLOG" | while IFS= read -r line; do
  case "$line" in
    RESULT\ *)
      echo "${line#RESULT }" >> "$RESULTS"
      ;;
    PEAKRSS\ *|THROUGHPUT\ *)
      echo "$line" >> "$STATS"
      echo "$line" >> "$PROGLOG"
      ;;
    *)
      echo "$line" >> "$PROGLOG"
      ;;
  esac
done
echo "=== $(date -u +%FT%TZ) run finished: $(wc -l < "$RESULTS") results ===" >> "$PROGLOG"
