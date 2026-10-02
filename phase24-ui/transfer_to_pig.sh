#!/bin/bash
# Reliable file transfer to Pig WSL via pigwsl-run.sh
# Usage: transfer_to_pig.sh <local_file> <pig_dest_path>
# Transfers via base64 chunks, verifies sha256 at the end.
set -euo pipefail

LOCAL_FILE="$1"
PIG_DEST="$2"
PIG_RUN="$HOME/workspace/pig/pigwsl-run.sh"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: local file not found: $LOCAL_FILE" >&2
  exit 1
fi

LOCAL_SHA=$(sha256sum "$LOCAL_FILE" | awk '{print $1}')
LOCAL_SIZE=$(wc -c < "$LOCAL_FILE")
echo "Local: $LOCAL_FILE ($LOCAL_SIZE bytes, sha256: $LOCAL_SHA)"

# Base64 encode and split into 1400-char chunks
B64_TMP=$(mktemp)
base64 -w0 "$LOCAL_FILE" | fold -w 1400 > "$B64_TMP"
CHUNKS=$(wc -l < "$B64_TMP")
echo "Split into $CHUNKS chunks"

# Pig staging file (base64 text)
PIG_B64="/tmp/pig_transfer_$(basename "$PIG_DEST").b64"

# Clear staging file on Pig
"$PIG_RUN" "rm -f '$PIG_B64' && echo cleared"

# Transfer each chunk
i=0
while IFS= read -r chunk || [ -n "$chunk" ]; do
  i=$((i+1))
  # Use printf to avoid echo interpretation issues; chunk is base64 (safe chars)
  "$PIG_RUN" "printf '%s\n' '$chunk' >> '$PIG_B64'" < /dev/null
  if [ $((i % 5)) -eq 0 ]; then
    echo "  ... $i/$CHUNKS chunks sent"
  fi
done < "$B64_TMP"
echo "All $CHUNKS chunks sent"

# Decode on Pig and verify
"$PIG_RUN" "base64 -d '$PIG_B64' > '$PIG_DEST' && sha256sum '$PIG_DEST' && wc -c '$PIG_DEST'" < /dev/null

# Get Pig sha for comparison
PIG_SHA=$("$PIG_RUN" "sha256sum '$PIG_DEST'" < /dev/null | awk '{print $1}')

rm -f "$B64_TMP"

if [ "$PIG_SHA" = "$LOCAL_SHA" ]; then
  echo "SUCCESS: checksums match ($PIG_SHA)"
  exit 0
else
  echo "FAILURE: checksum mismatch!" >&2
  echo "  local: $LOCAL_SHA" >&2
  echo "  pig:   $PIG_SHA" >&2
  exit 1
fi
