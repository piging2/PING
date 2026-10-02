#!/bin/bash
# Push a local file to the Pig repo via chunked base64 through pigwsl-run.sh.
# Usage: push.sh <local-file> <remote-abs-path>
# The bridge strips single quotes, so this script uses double quotes only.
set -euo pipefail

BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"
LOCAL="$1"
REMOTE="$2"
REMOTE_DIR="$(dirname "$REMOTE")"

if [ ! -f "$LOCAL" ]; then
  echo "missing: $LOCAL" >&2
  exit 1
fi

B64="$(base64 -w0 "$LOCAL")"
LEN="${#B64}"
CHUNK=3000

"$BRIDGE" "rm -f /tmp/fydpush.b64" < /dev/null > /dev/null

i=0
n=0
while [ "$i" -lt "$LEN" ]; do
  part="${B64:$i:$CHUNK}"
  "$BRIDGE" "printf %s $part >> /tmp/fydpush.b64" < /dev/null > /dev/null
  i=$((i + CHUNK))
  n=$((n + 1))
done

LOCAL_MD5="$(md5sum "$LOCAL" | cut -d' ' -f1)"
REMOTE_MD5="$("$BRIDGE" "mkdir -p $REMOTE_DIR && base64 -d /tmp/fydpush.b64 > $REMOTE && md5sum $REMOTE | cut -d\" \" -f1" < /dev/null 2>/dev/null | tail -1 | tr -d '\r\n ')"

if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
  echo "OK $REMOTE ($n chunks, md5 $LOCAL_MD5)"
else
  echo "MISMATCH $REMOTE local=$LOCAL_MD5 remote=$REMOTE_MD5" >&2
  exit 1
fi
