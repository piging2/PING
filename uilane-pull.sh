#!/bin/bash
# usage: uilane-pull.sh <wsl-abs-path> <local-file>
set -e
REMOTE="$1"; LOCAL="$2"
B64LEN=$(~/workspace/pig/pigwsl-run.sh "base64 -w0 ${REMOTE} | wc -c" < /dev/null)
rm -f "$LOCAL"; touch "$LOCAL"
POS=1
while [ "$POS" -le "$B64LEN" ]; do
  CHUNK=$(~/workspace/pig/pigwsl-run.sh "base64 -w0 ${REMOTE} | cut -c${POS}-$((POS+3999))" < /dev/null)
  printf '%s' "$CHUNK" >> "$LOCAL"
  POS=$((POS+4000))
done
base64 -d "$LOCAL" > "$LOCAL.bin" && mv "$LOCAL.bin" "$LOCAL"
echo "OK $LOCAL ($B64LEN b64 chars)"
