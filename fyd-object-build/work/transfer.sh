#!/bin/bash
# Transfer a staged file to the Pig via pigwsl-run.sh using the proven
# bridge protocol: base64 chunks of 2000 chars, 2 chunks per bridge call,
# md5 verification per chunk, whole-file md5 at the end.
# Usage: ./transfer.sh <local-staged-file> <pig-absolute-target>
set -euo pipefail

STAGED="$1"
TARGET="$2"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"

if [ ! -f "$STAGED" ]; then
  echo "missing staged file: $STAGED" >&2
  exit 1
fi

LOCAL_MD5=$(md5sum "$STAGED" | cut -d' ' -f1)
B64=$(base64 -w0 "$STAGED")
LEN=${#B64}
echo "transferring $STAGED -> $TARGET (${LEN} b64 chars, local md5 $LOCAL_MD5)"

# Stage: truncate temp target, ensure dir exists
"$BRIDGE" "rm -f '$TARGET.tmp' && mkdir -p \"\$(dirname '$TARGET')\" && echo staged" < /dev/null

# Python splits into 2000-char chunks and emits: index, chunk, md5-of-decoded
MAP=$(mktemp)
python3 - "$B64" > "$MAP" <<'PYEOF'
import sys, hashlib, base64
b64 = sys.argv[1]
i = 0
n = 0
while i < len(b64):
    chunk = b64[i:i+2000]
    raw = base64.b64decode(chunk)
    print(n, chunk, hashlib.md5(raw).hexdigest())
    i += 2000
    n += 1
PYEOF
TOTAL=$(wc -l < "$MAP")
echo "chunks: $TOTAL"

# Send 2 chunks per bridge call
i=0
while [ "$i" -lt "$TOTAL" ]; do
  j=$((i + 1))
  # Build the pig-side python inline. Chunks are base64 alphabet only: safe in single quotes.
  PYLINES=""
  while IFS=' ' read -r idx chunk md5; do
    PYLINES="${PYLINES}    ('${chunk}', '${md5}'),\n"
  done < <(sed -n "$((i+1)),$((j+1))p" "$MAP")
  SCRIPT="python3 -c \"
import base64, hashlib
pairs = [
$(printf '%b' "$PYLINES")]
with open('$TARGET.tmp', 'ab') as f:
    for c, h in pairs:
        raw = base64.b64decode(c)
        assert hashlib.md5(raw).hexdigest() == h, 'chunk md5 mismatch'
        f.write(raw)
print('XFROK')
\""
  OUT=$("$BRIDGE" "$SCRIPT" < /dev/null)
  echo "$OUT" | grep -q 'XFROK' || { echo "CHUNK CALL FAILED: $OUT" >&2; exit 1; }
  i=$((i + 2))
done

# Whole-file verification, then atomic move
VERIFY=$("$BRIDGE" "md5sum '$TARGET.tmp' | cut -d' ' -f1" < /dev/null)
REMOTE_MD5=$(echo "$VERIFY" | grep -oE '[0-9a-f]{32}' | tail -1)
if [ "$REMOTE_MD5" != "$LOCAL_MD5" ]; then
  echo "MD5 MISMATCH: local $LOCAL_MD5 remote $REMOTE_MD5" >&2
  exit 1
fi
"$BRIDGE" "mv '$TARGET.tmp' '$TARGET' && echo XFRMOVED" < /dev/null | grep -q 'XFRMOVED' || { echo "MOVE FAILED" >&2; exit 1; }
echo "OK: $TARGET (md5 $LOCAL_MD5)"
rm -f "$MAP"
