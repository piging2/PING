#!/bin/bash
# Transfer new convergence test files to the Pig worktree via chunked base64.
set -u
STAGING=~/workspace/staging
DEST=/home/nolan/worktrees/constitutional-convergence-authority-law/tests/event-authority-convergence
FILES="phase12_collision_duplicate_law.js phase13_fanout_exactly_once.js phase14_ordering.js phase9_model_b_proof.js"
for f in $FILES; do
  echo "=== $f ==="
  local_sha=$(sha256sum "$STAGING/$f" | cut -d' ' -f1)
  ~/workspace/pig/pigwsl-run.sh "rm -f $DEST/$f && touch $DEST/$f"
  base64 -w0 "$STAGING/$f" | fold -w 1400 > "/tmp/chunk_$f.txt"
  nchunks=$(wc -l < "/tmp/chunk_$f.txt")
  echo "chunks: $nchunks"
  while IFS= read -r chunk || [ -n "$chunk" ]; do
    ~/workspace/pig/pigwsl-run.sh "echo $chunk | base64 -d >> $DEST/$f" > /dev/null
  done < "/tmp/chunk_$f.txt"
  remote_sha=$(~/workspace/pig/pigwsl-run.sh "sha256sum $DEST/$f" | cut -d' ' -f1)
  if [ "$local_sha" = "$remote_sha" ]; then
    echo "OK sha256 $local_sha"
  else
    echo "MISMATCH local=$local_sha remote=$remote_sha"
  fi
  rm -f "/tmp/chunk_$f.txt"
done
