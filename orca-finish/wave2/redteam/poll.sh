#!/bin/bash
# W2-REDTEAM poller: watch sibling checkpoints for code landings.
# Read-only. Appends landing notices to the redteam CHECKPOINT.md.
# Usage: poll.sh [iterations] [sleep_seconds]
set -u
ITERS="${1:-4}"
SLEEP_S="${2:-900}"
DIR="$HOME/workspace/orca-finish/wave2"
CKPT="$DIR/redteam/CHECKPOINT.md"
STATE_SUMS="$DIR/redteam/.poll_state_sums"
mkdir -p "$DIR/redteam"

snapshot() {
  for f in "$DIR/impl-state/CHECKPOINT.md" "$DIR/impl-safety/CHECKPOINT.md"; do
    if [ -f "$f" ]; then md5sum "$f"; else echo "MISSING $f"; fi
  done
}

log() { echo "[$(date '+%H:%M')] $*" >> "$CKPT"; }

if [ ! -f "$STATE_SUMS" ]; then
  snapshot > "$STATE_SUMS"
  log "POLL: baseline snapshot taken (iterations=$ITERS, cadence=${SLEEP_S}s)."
fi

i=0
while [ "$i" -lt "$ITERS" ]; do
  i=$((i+1))
  snapshot > "$STATE_SUMS.new"
  if ! cmp -s "$STATE_SUMS" "$STATE_SUMS.new"; then
    log "POLL: LANDING DETECTED (poll $i/$ITERS). Checkpoint diff:"
    diff "$STATE_SUMS" "$STATE_SUMS.new" | head -20 >> "$CKPT"
    mv "$STATE_SUMS.new" "$STATE_SUMS"
    echo "LANDING at poll $i"
  else
    rm -f "$STATE_SUMS.new"
    echo "poll $i/$ITERS: no change"
  fi
  if [ "$i" -lt "$ITERS" ]; then sleep "$SLEEP_S"; fi
done
echo "POLL DONE: $ITERS polls completed."
