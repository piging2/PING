#!/bin/bash
# safe-put.sh <local_src> <pig_dest>
# Race-free chunked transfer to the Pig. The pigwsl-exec transport has a
# command-line length limit, so the base64 payload goes in ~3000-char chunks,
# each appended to a UNIQUE temp path (pid + timestamp + random: no shared
# /tmp/pigput.b64, no inter-transfer races). After all chunks land, md5 of
# the payload and of the decoded bytes are verified before the move.
# No backslashes, no single quotes anywhere (pigwsl-exec mangles both).
set -u
SRC="${1:?usage: safe-put.sh <local_src> <pig_dest>}"
DEST="${2:?usage: safe-put.sh <local_src> <pig_dest>}"
[ -f "$SRC" ] || { echo "safe-put: no such file: $SRC" >&2; exit 1; }
B64=$(base64 -w0 < "$SRC")
MD5=$(md5sum "$SRC" | cut -d" " -f1)
B64MD5=$(printf "%s" "$B64" | md5sum | cut -d" " -f1)
STAMP="safeput-$$-$(date +%s%N)-$RANDOM"
RTMP="/tmp/${STAMP}.b64"
PIGWSL=/home/hatch/workspace/bin/pigwsl-exec
# 1. create the unique temp file
"$PIGWSL" "touch \"$RTMP\"" || { echo "safe-put: cannot touch remote temp" >&2; exit 1; }
# 2. send chunks
CHUNK=3000
i=0
LEN=${#B64}
while [ "$i" -lt "$LEN" ]; do
  PART="${B64:$i:$CHUNK}"
  T2="printf %s \"__PART__\" >> \"$RTMP\""
  CMD="${T2//__PART__/$PART}"
  "$PIGWSL" "$CMD" || { echo "safe-put: chunk failed at offset $i" >&2; exit 1; }
  i=$((i + CHUNK))
done
# 3. verify, decode, move into place
T3=$(cat <<'PEOF'
set -u
GOT=$(md5sum "__RTMP__" | cut -d" " -f1)
if [ "$GOT" != "__B64MD5__" ]; then echo "SAFE-PUT-MD5-FAIL transport"; rm -f "__RTMP__"; exit 1; fi
base64 -d "__RTMP__" > "__RTMP__.bin" || { echo "SAFE-PUT-DECODE-FAIL"; rm -f "__RTMP__"; exit 1; }
GOT2=$(md5sum "__RTMP__.bin" | cut -d" " -f1)
if [ "$GOT2" != "__MD5__" ]; then echo "SAFE-PUT-MD5-FAIL decoded"; rm -f "__RTMP__" "__RTMP__.bin"; exit 1; fi
mkdir -p "$(dirname "__DEST__")"
mv "__RTMP__.bin" "__DEST__"
rm -f "__RTMP__"
echo "safe-put OK: __SRC__ -> __DEST__ (md5=__MD5__)"
PEOF
)
F="${T3//__RTMP__/$RTMP}"
F="${F//__B64MD5__/$B64MD5}"
F="${F//__MD5__/$MD5}"
F="${F//__SRC__/$SRC}"
F="${F//__DEST__/$DEST}"
"$PIGWSL" "$F"
