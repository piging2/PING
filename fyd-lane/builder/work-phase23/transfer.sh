#!/bin/bash
# Transfer one file to the Pig via 2000-char base64 chunks (2 per bridge call).
# Usage: transfer.sh <local-file> <pig-dest-path>
set -u
LOCAL="$1"
DEST="$2"
STAGE="/tmp/stage_xfer.b64"
rm -rf /tmp/xfer_chunks && mkdir -p /tmp/xfer_chunks
python3 - "$LOCAL" <<'PY'
import base64, sys
data = open(sys.argv[1], "rb").read()
b = base64.b64encode(data).decode()
chunks = [b[i:i+2000] for i in range(0, len(b), 2000)]
for n, c in enumerate(chunks):
    open("/tmp/xfer_chunks/c%02d" % n, "w").write(c)
print("chunks:", len(chunks))
PY
LOCAL_MD5=$(md5sum "$LOCAL" | cut -d' ' -f1)
echo "local md5: $LOCAL_MD5"
N=$(ls /tmp/xfer_chunks | wc -l)
~/workspace/pig/pigwsl-run.sh "rm -f $STAGE && touch $STAGE && echo staged" < /dev/null
i=0
while [ $i -lt "$N" ]; do
  C1=$(cat "/tmp/xfer_chunks/c$(printf '%02d' $i)")
  i=$((i+1))
  if [ $i -lt "$N" ]; then
    C2=$(cat "/tmp/xfer_chunks/c$(printf '%02d' $i)")
    i=$((i+1))
    ~/workspace/pig/pigwsl-run.sh "printf '%s' '$C1' >> $STAGE && printf '%s' '$C2' >> $STAGE && wc -c < $STAGE" < /dev/null
  else
    ~/workspace/pig/pigwsl-run.sh "printf '%s' '$C1' >> $STAGE && wc -c < $STAGE" < /dev/null
  fi
done
REMOTE_MD5=$(~/workspace/pig/pigwsl-run.sh "base64 -d $STAGE > '$DEST' && md5sum '$DEST'" < /dev/null | cut -d' ' -f1)
echo "remote md5: $REMOTE_MD5"
if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then echo "TRANSFER OK: $DEST"; else echo "TRANSFER MISMATCH: $DEST"; exit 1; fi
~/workspace/pig/pigwsl-run.sh "rm -f $STAGE" < /dev/null
rm -rf /tmp/xfer_chunks
