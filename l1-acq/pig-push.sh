#!/bin/bash
# Push a local file to the Pig via base64 chunks.
# Quoting rule (verified): ssh remote command in single quotes, inner
# bash -c in double quotes; inside CMD double quotes, >> passes through
# to bash untouched, so NO caret-escaping of > inside them.
# Usage: pig-push.sh <local-file> <remote-path>
set -u
LOCAL="$1"
REMOTE="$2"
SSH="ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes pigwsl"

B64=$(base64 -w0 "$LOCAL")
LEN=${#B64}
CHUNK=6000
TMPB64="/tmp/pigpush-$$.b64"

timeout 60 $SSH 'wsl -- bash -c "rm -f '"$TMPB64"' && touch '"$TMPB64"'"' >/dev/null 2>&1

i=0
while [ $i -lt $LEN ]; do
  piece=${B64:$i:$CHUNK}
  timeout 60 $SSH 'wsl -- bash -c "echo '"$piece"' >> '"$TMPB64"'"' >/dev/null 2>&1 || { echo "CHUNK_FAIL at $i"; exit 1; }
  i=$((i + CHUNK))
done

LOCAL_BYTES=$(wc -c < "$LOCAL")
REMOTE_BYTES=$(timeout 60 $SSH 'wsl -- bash -c "base64 -d '"$TMPB64"' > '"$REMOTE"' && wc -c < '"$REMOTE"' && rm -f '"$TMPB64"'"' 2>/dev/null | tr -d ' \r\n')
if [ "$LOCAL_BYTES" = "$REMOTE_BYTES" ]; then
  echo "OK $LOCAL -> $REMOTE ($REMOTE_BYTES bytes)"
else
  echo "SIZE_MISMATCH local=$LOCAL_BYTES remote=$REMOTE_BYTES"
  exit 1
fi
