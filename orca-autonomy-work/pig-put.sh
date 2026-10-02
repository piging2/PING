#!/bin/bash
# pig-put.sh: transfer a local file to Pig WSL byte-exactly via chunked base64.
# Usage: pig-put.sh <local-file> <remote-path>
# Verifies sha256 on both sides; exits nonzero on mismatch.
set -euo pipefail
LOCAL="$1"
REMOTE="$2"
B64=$(base64 -w0 "$LOCAL")
LEN=${#B64}
CHUNK=1400
RUN=~/workspace/pig/pigwsl-run.sh
"$RUN" ": > '$REMOTE'.b64"
i=0
while [ $i -lt "$LEN" ]; do
  DATA=${B64:$i:$CHUNK}
  "$RUN" "printf '%s' '$DATA' >> '$REMOTE'.b64"
  i=$((i + CHUNK))
done
"$RUN" "base64 -d '$REMOTE'.b64 > '$REMOTE' && rm -f '$REMOTE'.b64"
LOCAL_SHA=$(sha256sum "$LOCAL" | awk '{print $1}')
REMOTE_SHA=$("$RUN" "sha256sum '$REMOTE'" | awk '{print $1}')
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "CHECKSUM MISMATCH local=$LOCAL_SHA remote=$REMOTE_SHA" >&2
  exit 1
fi
echo "OK $REMOTE sha256=$REMOTE_SHA"
