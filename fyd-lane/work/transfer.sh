#!/bin/bash
# usage: transfer.sh <local-path> <remote-path>
set -e
LOCAL="$1"; REMOTE="$2"
[ -f "$LOCAL" ] || { echo "missing: $LOCAL"; exit 1; }
LOCAL_MD5=$(md5sum "$LOCAL" | cut -d' ' -f1)
B64=$(base64 -w0 "$LOCAL")
~/workspace/pig/pigwsl-run.sh "rm -f /tmp/t.b64 && touch /tmp/t.b64 && echo init-ok" < /dev/null | tail -1
CHUNKS=0
while [ -n "$B64" ]; do
  CHUNK="${B64:0:3000}"
  B64="${B64:3000}"
  ~/workspace/pig/pigwsl-run.sh "printf '%s' '$CHUNK' >> /tmp/t.b64 && wc -c < /tmp/t.b64" < /dev/null | tail -1
  CHUNKS=$((CHUNKS+1))
done
echo "sent $LOCAL -> $REMOTE in $CHUNKS chunks (local md5 $LOCAL_MD5)"
OUT=$(~/workspace/pig/pigwsl-run.sh "base64 -d /tmp/t.b64 > '$REMOTE' && md5sum '$REMOTE'" < /dev/null)
echo "$OUT" | tail -2
