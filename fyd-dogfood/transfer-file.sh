#!/bin/bash
# transfer-file.sh <local_path> <pig_absolute_dest>
# Copies a local file to the Pig via pigwsl-run.sh using python base64
# chunking (2000 chars/chunk, 2 chunks per bridge call per the ~6000-char
# total command-line limit), with md5 verification of the decoded file.
set -euo pipefail
LOCAL="$1"
DEST="$2"
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"

B64="$(base64 -w0 "$LOCAL")"
LEN=${#B64}
CHUNK=2000
# python-free chunking with fold -w (safe at 2000 cols per AGENTS.md)
TMPD="$(mktemp -d)"
echo "$B64" | fold -w "$CHUNK" > "$TMPD/chunks.txt"
NCHUNKS=$(wc -l < "$TMPD/chunks.txt")
echo "transfer: $LOCAL -> $DEST ($LEN b64 chars, $NCHUNKS chunks)"

STAGE="/tmp/transfer_$(basename "$DEST").b64"
"$BRIDGE" "rm -f '$STAGE' && touch '$STAGE'" < /dev/null >/dev/null

i=0
while IFS= read -r c1; do
  i=$((i+1))
  if IFS= read -r c2; then
    i=$((i+1))
    # 2 chunks per call
    "$BRIDGE" "printf '%s' '$c1' >> '$STAGE' && printf '%s' '$c2' >> '$STAGE' && wc -c < '$STAGE'" < /dev/null
  else
    "$BRIDGE" "printf '%s' '$c1' >> '$STAGE' && wc -c < '$STAGE'" < /dev/null
  fi
done < "$TMPD/chunks.txt" > "$TMPD/sizes.txt"
tail -2 "$TMPD/sizes.txt"

LOCAL_MD5=$(md5sum "$LOCAL" | cut -d' ' -f1)
"$BRIDGE" "base64 -d '$STAGE' > '$DEST' && md5sum '$DEST' && rm -f '$STAGE'" < /dev/null > "$TMPD/remote.txt"
REMOTE_MD5=$(cut -d' ' -f1 "$TMPD/remote.txt")
echo "local md5 : $LOCAL_MD5"
echo "remote md5: $REMOTE_MD5"
if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then
  echo "MD5 MISMATCH" >&2
  exit 1
fi
echo "OK: $DEST"
rm -rf "$TMPD"
