#!/bin/bash
# Chunked base64 transfer to the Pig: append chunks SEQUENTIALLY, then verify sha256.
SRC="$1"; DEST="$2"
[ -f "$SRC" ] || { echo "missing src $SRC"; exit 1; }
LOCAL_SHA=$(sha256sum "$SRC" | cut -d' ' -f1)
~/workspace/pig/pigwsl-run.sh "rm -f '$DEST' && touch '$DEST'"
python3 - "$SRC" <<'PYEOF' > /tmp/p0a_xfer_cmds.txt
import base64, sys
data = open(sys.argv[1],'rb').read()
b64 = base64.b64encode(data).decode()
CH = 1400
chunks = [b64[i:i+CH] for i in range(0, len(b64), CH)]
print(len(chunks))
PYEOF
# re-split in bash and send sequentially
python3 - "$SRC" "$DEST" <<'PYEOF'
import base64, sys, subprocess
src, dest = sys.argv[1], sys.argv[2]
data = open(src,'rb').read()
b64 = base64.b64encode(data).decode()
CH = 1400
for i in range(0, len(b64), CH):
    chunk = b64[i:i+CH]
    cmd = ["bash", "/home/hatch/workspace/pig/pigwsl-run.sh", "echo " + chunk + " | base64 -d >> '" + dest + "'"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("CHUNK FAILED at offset", i); print(r.stderr[-500:]); sys.exit(1)
    print("chunk ok", i//CH)
PYEOF
REMOTE_SHA=$(~/workspace/pig/pigwsl-run.sh "sha256sum '$DEST'" | awk '{print $1}')
echo "LOCAL : $LOCAL_SHA"
echo "REMOTE: $REMOTE_SHA"
[ "$LOCAL_SHA" = "$REMOTE_SHA" ] && echo "TRANSFER OK" || { echo "TRANSFER MISMATCH"; exit 1; }
