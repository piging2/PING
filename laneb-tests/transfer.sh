#!/bin/bash
# LANE B file transfer: local -> Pig worktree via chunked base64.
# Usage: transfer.sh <local_src> <worktree_dest_relative>
set -u
SRC="$1"
DEST_REL="$2"
WORKTREE="/home/nolan/worktrees/constitutional-convergence"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"

B64="$(base64 -w0 "$SRC")"
LOCAL_MD5="$(md5sum "$SRC" | cut -d' ' -f1)"
TOTAL_LEN="${#B64}"
echo "transfer: $SRC -> $DEST_REL (${TOTAL_LEN} b64 chars, md5 $LOCAL_MD5)"

"$BRIDGE" "mkdir -p '$WORKTREE/$(dirname "$DEST_REL")' && rm -f /tmp/laneb_xfer.b64 && touch /tmp/laneb_xfer.b64" < /dev/null >/dev/null

OFFSET=0
CHUNK=3000
N=0
while [ "$OFFSET" -lt "$TOTAL_LEN" ]; do
  PART="${B64:$OFFSET:$CHUNK}"
  PLEN="${#PART}"
  # base64 alphabet has no shell metacharacters; single-quote wrap is safe
  GOT="$("$BRIDGE" "printf '%s' '$PART' >> /tmp/laneb_xfer.b64 && wc -c < /tmp/laneb_xfer.b64" < /dev/null)"
  N=$((N+1))
  OFFSET=$((OFFSET + PLEN))
  echo "  chunk $N: sent $PLEN chars, pig total now $GOT"
done

"$BRIDGE" "base64 -d /tmp/laneb_xfer.b64 > '$WORKTREE/$DEST_REL' && md5sum '$WORKTREE/$DEST_REL' && rm -f /tmp/laneb_xfer.b64" < /dev/null
