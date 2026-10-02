#!/bin/bash
# pig-put.sh <local-file> <pig-dest-path>
#
# Chunked base64 transfer through the Pig bridge (~/workspace/pig/pigwsl-run.sh)
# with md5 verification. Honors the bridge limits learned 2026-09-21:
#   - total ssh command line hard limit ~8191 chars
#   - pigwsl-run.sh base64-inflates the script 4/3 + wrapper overhead
#   => keep each bridge call's script under ~6000 chars:
#      2 x 2000-char base64 chunks per call is safe, 3 x 2000 fails.
# Chunking is python-based (fold -w silently stops folding above ~2000 cols).
#
# Usage: ./pig-put.sh ./placement.test.ts /home/nolan/projects/ping/src/fyd/ui/__tests__/placement.test.ts
set -euo pipefail

LOCAL="${1:?usage: pig-put.sh <local-file> <pig-dest>}"
DEST="${2:?usage: pig-put.sh <local-file> <pig-dest>}"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"
CHUNK=2000
PER_CALL=2

LOCAL_MD5="$(md5sum "$LOCAL" | cut -d' ' -f1)"
LOCAL_SIZE="$(stat -c%s "$LOCAL")"
echo "pig-put: $LOCAL ($LOCAL_SIZE bytes, md5 $LOCAL_MD5) -> pig:$DEST"

B64="$(mktemp)"
CHUNKS="$(mktemp)"
trap 'rm -f "$B64" "$CHUNKS"' EXIT
base64 -w0 "$LOCAL" > "$B64"
python3 -c "
import sys
d = open(sys.argv[1]).read().strip()
for i in range(0, len(d), $CHUNK):
    print(d[i:i+$CHUNK])
" "$B64" > "$CHUNKS"
NCHUNKS="$(wc -l < "$CHUNKS")"
echo "pig-put: $NCHUNKS chunks of <= $CHUNK chars"

REMOTE_TMP="/tmp/pigput_$$_$(date +%s).b64"
"$BRIDGE" "rm -f '$REMOTE_TMP'" < /dev/null

# Feed chunks, PER_CALL per bridge call, via printf (base64 alphabet is
# shell-safe; printf arg avoids heredoc/stdin interference on the bridge).
mapfile -t LINES < "$CHUNKS"
i=0
while [ "$i" -lt "$NCHUNKS" ]; do
  script=""
  for ((k=0; k<PER_CALL && i<NCHUNKS; k++, i++)); do
    script="${script}printf '%s' '${LINES[$i]}' >> '$REMOTE_TMP';"
  done
  # sanity: keep the script well under the ~6000 char safe budget
  if [ "${#script}" -gt 6000 ]; then
    echo "pig-put: FATAL: bridge script ${#script} chars exceeds safe budget" >&2
    exit 1
  fi
  "$BRIDGE" "$script" < /dev/null
done

# Decode on the Pig, verify md5, then clean up the staging file.
REMOTE_MD5="$("$BRIDGE" "base64 -d '$REMOTE_TMP' > '$DEST' && md5sum '$DEST' | cut -d\" \" -f1 && rm -f '$REMOTE_TMP'" < /dev/null | tail -1)"
echo "pig-put: remote md5 $REMOTE_MD5"
if [ "$REMOTE_MD5" != "$LOCAL_MD5" ]; then
  echo "pig-put: FATAL: md5 mismatch (local $LOCAL_MD5 != remote $REMOTE_MD5)" >&2
  exit 1
fi
echo "pig-put: OK"
