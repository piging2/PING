#!/bin/bash
# xfer.sh <local-file> <remote-path> : chunked base64 transfer to the Pig, sequential appends + sha256 verify
set -e
LOCAL="$1"; REMOTE="$2"
if [ -z "$LOCAL" ] || [ -z "$REMOTE" ]; then echo "usage: xfer.sh <local> <remote>"; exit 2; fi
LOCAL_SUM=$(sha256sum "$LOCAL" | awk '{print $1}')
TMPDIR_XFER=$(mktemp -d)
/home/hatch/workspace/pig/pigwsl-run.sh "mkdir -p $(dirname "$REMOTE") && rm -f $REMOTE" < /dev/null
base64 -w0 "$LOCAL" | fold -w 1400 > "$TMPDIR_XFER/chunks"
while IFS= read -r chunk || [ -n "$chunk" ]; do
  /home/hatch/workspace/pig/pigwsl-run.sh "echo $chunk | base64 -d >> $REMOTE" < /dev/null
done < "$TMPDIR_XFER/chunks"
REMOTE_SUM=$(/home/hatch/workspace/pig/pigwsl-run.sh "sha256sum $REMOTE" < /dev/null | awk '{print $1}')
if [ "$LOCAL_SUM" = "$REMOTE_SUM" ]; then
  echo "OK sha256=$REMOTE_SUM"
else
  echo "MISMATCH local=$LOCAL_SUM remote=$REMOTE_SUM"; exit 1
fi
rm -rf "$TMPDIR_XFER"
