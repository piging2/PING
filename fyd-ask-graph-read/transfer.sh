#!/bin/bash
# Chunked base64 transfer to the Pig (python-safe 2000-char chunks, md5 verified).
# Usage: transfer.sh <local-file> <remote-abs-path>
set -euo pipefail
LOCAL="$1"
REMOTE="$2"
PIG=~/workspace/pig/pigwsl-run.sh

B64="$(base64 -w0 "$LOCAL")"
MD5="$(md5sum "$LOCAL" | cut -d' ' -f1)"
LEN=${#B64}
TMP="/tmp/transfer-$$.b64"

$PIG "rm -f '$TMP'" < /dev/null >/dev/null

i=0
while [ $i -lt $LEN ]; do
  chunk="${B64:$i:2000}"
  # base64 alphabet is shell-safe inside single quotes
  $PIG "printf '%s' '$chunk' >> '$TMP'" < /dev/null >/dev/null
  i=$((i + 2000))
done

REMOTE_MD5="$($PIG "base64 -d '$TMP' > '$REMOTE' && md5sum '$REMOTE' | cut -d' ' -f1 && rm -f '$TMP'" < /dev/null)"
# command output is JSON-wrapped; extract the md5 (32 hex chars)
REMOTE_MD5="$(echo "$REMOTE_MD5" | grep -oE '[0-9a-f]{32}' | head -1)"

if [ "$REMOTE_MD5" != "$MD5" ]; then
  echo "MD5 MISMATCH for $REMOTE: local=$MD5 remote=$REMOTE_MD5" >&2
  exit 1
fi
echo "OK $REMOTE md5=$MD5"
