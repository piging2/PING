#!/bin/bash
# xfer.sh <local-file> <pig-dest> : chunked base64 transfer to the Pig.
set -e
SRC="$1"; DEST="$2"
B64=$(base64 -w0 "$SRC")
LEN=${#B64}
CHUNK=1400
# truncate dest first
~/workspace/pig/pigwsl-run.sh "rm -f '$DEST' && touch '$DEST' && echo TRUNC_OK" >/dev/null
i=0
while [ $i -lt $LEN ]; do
  piece="${B64:$i:$CHUNK}"
  ~/workspace/pig/pigwsl-run.sh "echo '$piece' | base64 -d >> '$DEST'" >/dev/null
  i=$((i + CHUNK))
done
LOCAL_SHA=$(sha256sum "$SRC" | cut -d' ' -f1)
REMOTE_SHA=$(~/workspace/pig/pigwsl-run.sh "sha256sum '$DEST'" | grep -oE '^[a-f0-9]{64}')
if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then echo "XFER_OK $DEST sha256=$LOCAL_SHA"; else echo "XFER_FAIL local=$LOCAL_SHA remote=$REMOTE_SHA"; exit 1; fi
