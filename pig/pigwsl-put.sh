#!/bin/bash
# pigwsl-put: copy a local file into Pig WSL at the given absolute path.
# usage: pigwsl-put.sh <local-file> <wsl-abs-path>
# Base64 is split into 4000-char chunks (Windows cmd.exe command-line limit
# on the ssh hop); chunks are appended sequentially, then sha256-verified.
set -e
SRC="$1"; DST="$2"
LOCAL_SHA=$(sha256sum "$SRC" | awk '{print $1}')
TMPD=$(mktemp -d)
base64 -w0 "$SRC" | fold -w 4000 > "$TMPD/chunks"
N=$(wc -l < "$TMPD/chunks")
~/workspace/pig/pigwsl-run.sh "rm -f ${DST} && touch ${DST}" >/dev/null
i=0
while IFS= read -r chunk || [ -n "$chunk" ]; do
  i=$((i+1))
  ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -- bash -c \"echo ${chunk} | base64 -d >> ${DST}\"" < /dev/null || {
    echo "chunk $i/$N failed" >&2; exit 1
  }
done < "$TMPD/chunks"
rm -rf "$TMPD"
REMOTE_SHA=$(~/workspace/pig/pigwsl-run.sh "sha256sum ${DST} | cut -d' ' -f1")
if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "OK $DST sha256=$LOCAL_SHA"
else
  echo "MISMATCH local=$LOCAL_SHA remote=$REMOTE_SHA" >&2
  exit 1
fi
