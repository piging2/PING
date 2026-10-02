#!/bin/bash
# pig-put: transfer a local file to a WSL path on the Pig via chunked base64
# through pigwsl-run.sh (mandatory bridge; child sandboxes have no Pig mount).
# Chunking rule (AGENTS.md): base64 chunks of ~2000 chars via python, md5 per transfer.
# Usage: pig-put.sh <local-file> <remote-wsl-absolute-path>
set -euo pipefail
LOCAL="$1"
REMOTE="$2"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"
EXPECT=$(md5sum "$LOCAL" | awk '{print $1}')
TMPD=$(mktemp -d)
trap 'rm -rf "$TMPD"' EXIT
python3 - "$LOCAL" "$TMPD" <<'PYEOF'
import sys, base64, os
data = open(sys.argv[1], 'rb').read()
b64 = base64.b64encode(data).decode()
d = sys.argv[2]
n = 0
for i in range(0, len(b64), 2000):
    open(os.path.join(d, 'c%04d' % n), 'w').write(b64[i:i+2000])
    n += 1
print('chunks=%d' % n)
PYEOF
shopt -s nullglob
CHUNKS=("$TMPD"/c*)
shopt -u nullglob
if [ "${#CHUNKS[@]}" -eq 0 ]; then
  echo "pig-put: refusing to transfer empty chunk set for $LOCAL" >&2
  exit 1
fi
"$BRIDGE" 'rm -f /tmp/pigput.b64; touch /tmp/pigput.b64' < /dev/null > /dev/null
for f in "${CHUNKS[@]}"; do
  "$BRIDGE" "printf '%s' '$(cat "$f")' >> /tmp/pigput.b64" < /dev/null > /dev/null
done
FINALIZE_SCRIPT="mkdir -p \"\$(dirname \"$REMOTE\")\"; base64 -d /tmp/pigput.b64 > \"$REMOTE\"; GOT=\$(md5sum \"$REMOTE\" | cut -d' ' -f1); rm -f /tmp/pigput.b64; if [ \"\$GOT\" = \"$EXPECT\" ]; then echo PIGPUT_OK; else echo \"PIGPUT_MISMATCH got=\$GOT\"; fi"
OUT=$("$BRIDGE" "$FINALIZE_SCRIPT" < /dev/null)
if echo "$OUT" | grep -q PIGPUT_OK; then
  echo "pig-put OK: $LOCAL -> $REMOTE (md5=$EXPECT)"
else
  echo "pig-put FAILED: $LOCAL -> $REMOTE" >&2
  echo "$OUT" >&2
  exit 1
fi
