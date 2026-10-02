#!/bin/bash
set -u
STAGING=~/workspace/staging
DEST=/home/nolan/worktrees/constitutional-convergence-authority-law/tests/event-authority-convergence
FILES="phase12_collision_duplicate_law.js phase13_fanout_exactly_once.js phase14_ordering.js phase9_model_b_proof.js"
for f in $FILES; do
  echo "=== $f ==="
  ~/workspace/pig/pigwsl-run.sh "rm -f $DEST/$f && touch $DEST/$f" < /dev/null > /dev/null
  base64 -w0 "$STAGING/$f" | fold -w 1400 > "/tmp/chunk_$f.txt"
  while IFS= read -r chunk || [ -n "$chunk" ]; do
    ~/workspace/pig/pigwsl-run.sh "echo $chunk | base64 -d >> $DEST/$f" < /dev/null > /dev/null
  done < "/tmp/chunk_$f.txt"
  echo "local: $(sha256sum "$STAGING/$f" | cut -d' ' -f1)"
  rm -f "/tmp/chunk_$f.txt"
done
