#!/bin/bash
# chunked-transfer.sh — byte-exact file transfer to the Pig worktree.
# usage: chunked-transfer.sh <local-file> <pig-absolute-dest>
# Per AGENTS.md lessons: ~1400-byte chunks, sequential appends, sha256 verify.
set -u
LOCAL="$1"
DEST="$2"
CHUNK=1400
WORKTREE="/home/nolan/worktrees/constitutional-convergence-authority-law"

if [ ! -f "$LOCAL" ]; then echo "missing local file: $LOCAL"; exit 1; fi

LOCAL_SHA=$(sha256sum "$LOCAL" | cut -d' ' -f1)
SIZE=$(stat -c%s "$LOCAL")

# start fresh on the Pig side
~/workspace/pig/pigwsl-run.sh "rm -f '$DEST' && touch '$DEST'" >/dev/null || { echo "init failed"; exit 1; }

# stream chunks sequentially (no parallelism: parallel appends interleave)
split -b $CHUNK "$LOCAL" /tmp/p7chunk_$$
for c in /tmp/p7chunk_$$*; do
  B64=$(base64 -w0 "$c")
  ~/workspace/pig/pigwsl-run.sh "echo $B64 | base64 -d >> '$DEST'" >/dev/null < /dev/null || { echo "chunk failed: $c"; rm -f /tmp/p7chunk_$$*; exit 1; }
done
rm -f /tmp/p7chunk_$$*

REMOTE_SHA=$(~/workspace/pig/pigwsl-run.sh "sha256sum '$DEST'" < /dev/null | cut -d' ' -f1)
if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "OK $DEST ($SIZE bytes, sha256 match)"
else
  echo "MISMATCH $DEST local=$LOCAL_SHA remote=$REMOTE_SHA"
  exit 1
fi
