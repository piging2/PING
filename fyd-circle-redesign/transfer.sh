#!/bin/bash
# Transfer inline-object-circle.tsx to the Pig in 2000-char base64 chunks,
# then send patch-page.py whole (small), run it, and md5-verify.
set -e
BRIDGE=~/workspace/pig/pigwsl-run.sh
SRC_DIR=~/workspace/fyd-circle-redesign
DEST=/home/nolan/projects/ping/src/fyd/ui/inline-object-circle.tsx
STAGE=/home/nolan/.fyd-circle-stage.b64

cd "$SRC_DIR"
LOCAL_MD5=$(md5sum inline-object-circle.tsx | awk '{print $1}')
echo "local md5: $LOCAL_MD5"

# 1. truncate stage file
"$BRIDGE" ": > $STAGE" < /dev/null

# 2. send chunks
base64 -w0 inline-object-circle.tsx | fold -w 2000 | while IFS= read -r chunk || [ -n "$chunk" ]; do
  "$BRIDGE" "printf '%s' '$chunk' >> $STAGE" < /dev/null > /dev/null
done
echo "chunks sent"

# 3. decode + verify + install
"$BRIDGE" "base64 -d $STAGE > $DEST && md5sum $DEST && rm -f $STAGE" < /dev/null

# 4. send patch script whole (base64, ~3.9KB -> under the 6000 char bridge budget)
B64=$(base64 -w0 patch-page.py)
"$BRIDGE" "printf '%s' '$B64' | base64 -d > /home/nolan/.fyd-patch-page.py && python3 /home/nolan/.fyd-patch-page.py" < /dev/null

echo "transfer complete"
