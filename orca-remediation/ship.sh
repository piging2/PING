#!/bin/bash
# ship a local file to the Pig worktree via pigwsl-run.sh chunked base64 transfer
set -euo pipefail
LOCAL="$1"
DEST_REL="$2"
DEST="/home/nolan/worktrees/orca-autonomy/${DEST_REL}"
~/workspace/pig/pigwsl-run.sh "rm -f '${DEST}' && touch '${DEST}' && sha256sum '${DEST}'"
B64="$(base64 -w0 "$LOCAL")"
LEN="${#B64}"
CHUNK=1400
i=0
while [ "$i" -lt "$LEN" ]; do
  chunk="${B64:$i:$CHUNK}"
  if [ -n "$chunk" ]; then
    ~/workspace/pig/pigwsl-run.sh "echo '${chunk}' | base64 -d >> '${DEST}'"
  fi
  i=$((i + CHUNK))
done
echo "--- local ---"
sha256sum "$LOCAL"
echo "--- pig ---"
~/workspace/pig/pigwsl-run.sh "sha256sum '${DEST}' && wc -c '${DEST}'"
