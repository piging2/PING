#!/bin/bash
# push-to-pig.sh: transfer a local file to the Pig WSL repo with md5 verification.
# usage: push-to-pig.sh <local-file> <pig-dest-path>
# Pig dest is absolute on the Pig (e.g. /home/nolan/ping/runtime/constitutional/src/ping-projector.ts)
set -euo pipefail

LOCAL_FILE="$1"
PIG_DEST="$2"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"
CHUNK=3000
TMPB64="/tmp/push-to-pig-$$.b64"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: local file not found: $LOCAL_FILE" >&2
  exit 1
fi

LOCAL_MD5=$(md5sum "$LOCAL_FILE" | awk '{print $1}')
LOCAL_SIZE=$(wc -c < "$LOCAL_FILE")
echo "local: $LOCAL_FILE ($LOCAL_SIZE bytes, md5 $LOCAL_MD5)"

base64 -w0 "$LOCAL_FILE" > "$TMPB64"
TOTAL=$(wc -c < "$TMPB64")

# init remote staging file
"$BRIDGE" "rm -f /tmp/push-stage.b64 && touch /tmp/push-stage.b64" < /dev/null > /dev/null

OFFSET=0
PART=0
while [ "$OFFSET" -lt "$TOTAL" ]; do
  PART=$((PART+1))
  CHUNKDATA=$(dd if="$TMPB64" bs=1 skip="$OFFSET" count="$CHUNK" 2>/dev/null)
  "$BRIDGE" "printf '%s' '$CHUNKDATA' >> /tmp/push-stage.b64" < /dev/null > /dev/null
  OFFSET=$((OFFSET + CHUNK))
done

echo "sent $PART chunks ($TOTAL b64 chars)"

# decode to destination, print md5 for verification
OUT=$("$BRIDGE" "mkdir -p \"\$(dirname '$PIG_DEST')\" && base64 -d /tmp/push-stage.b64 > '$PIG_DEST' && echo \"REMOTE_MD5:\$(md5sum '$PIG_DEST' | awk '{print \$1}')\" && wc -c < '$PIG_DEST' && rm -f /tmp/push-stage.b64" < /dev/null)
echo "$OUT" | grep -o "REMOTE_MD5:[a-f0-9]*" || true
REMOTE_MD5=$(echo "$OUT" | grep -o "REMOTE_MD5:[a-f0-9]*" | cut -d: -f2)

if [ "$REMOTE_MD5" = "$LOCAL_MD5" ]; then
  echo "VERIFY OK"
else
  echo "VERIFY FAILED: local=$LOCAL_MD5 remote=$REMOTE_MD5" >&2
  exit 1
fi

rm -f "$TMPB64"
