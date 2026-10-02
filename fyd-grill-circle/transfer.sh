#!/bin/bash
# FYD circle redesign transfer: staged files -> Pig object-layer.
# Rules: python base64 chunks <= 2000 chars, per-chunk size check in the
# same bridge call, md5 verification after decode, bridge scripts under
# ~6000 chars (2 chunks per call max), < /dev/null on every bridge call,
# no /tmp (sandbox wipes it).
set -uo pipefail
WORK=~/workspace/fyd-grill-circle/work
CHUNKDIR=~/workspace/fyd-grill-circle/chunks
DEST=/home/nolan/projects/ping/src/fyd/ui/object-layer
BRIDGE=~/workspace/pig/pigwsl-run.sh
mkdir -p "$CHUNKDIR"
FILES="viewport.ts view-transitions.ts design-compiler.ts fyd-shell.ts presentation-spec.ts PeekCard.tsx WorkspaceSheet.tsx ObjectCircle.tsx MobileSheet.tsx circle-progressive.test.tsx"

for f in $FILES; do
  src="$WORK/$f"
  if [ ! -f "$src" ]; then echo "MISSING SOURCE: $f"; exit 1; fi
  localmd5=$(md5sum "$src" | cut -d' ' -f1)
  echo "=== $f (local md5 $localmd5) ==="
  python3 - "$src" "$CHUNKDIR/chunks.txt" <<'PYEOF'
import base64, sys
data = open(sys.argv[1], 'rb').read()
b64 = base64.b64encode(data).decode()
with open(sys.argv[2], 'w') as fh:
    for i in range(0, len(b64), 2000):
        fh.write(b64[i:i+2000] + "\n")
print(f"chunks: {(len(b64) + 1999) // 2000}, bytes: {len(data)}, b64: {len(b64)}")
PYEOF
  "$BRIDGE" "rm -f $DEST/$f.part && : > $DEST/$f.part" < /dev/null
  mapfile -t CHUNKS < "$CHUNKDIR/chunks.txt"
  i=0
  n=${#CHUNKS[@]}
  while [ $i -lt $n ]; do
    c1="${CHUNKS[$i]}"
    c2=""
    if [ $((i+1)) -lt $n ]; then c2="${CHUNKS[$((i+1))]}"; fi
    l1=${#c1}; l2=${#c2}
    # 2 chunks max per call; per-chunk size verified inside the same call.
    "$BRIDGE" "a='$c1'; b='$c2'; [ \${#a} -eq $l1 ] && [ \${#b} -eq $l2 ] && { printf '%s' \"\$a\" >> $DEST/$f.part; printf '%s' \"\$b\" >> $DEST/$f.part; } || { echo CHUNK-SIZE-MISMATCH; exit 1; }" < /dev/null
    i=$((i+2))
  done
  remotemd5=$("$BRIDGE" "base64 -d $DEST/$f.part > $DEST/$f && rm $DEST/$f.part && md5sum $DEST/$f | cut -d' ' -f1" < /dev/null | tr -d '\r\n')
  echo "local : $localmd5"
  echo "remote: $remotemd5"
  if [ "$localmd5" = "$remotemd5" ]; then echo "OK $f"; else echo "MD5 MISMATCH: $f"; exit 1; fi
done
echo "ALL TRANSFERS OK"
