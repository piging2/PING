#!/bin/bash
# push-file.sh <local-path> <remote-path> : multi-part base64-chunk transfer.
# Each pigwsl-exec call stays well under the Pig-side CMD 8191-char limit.
set -u
LOCAL="$1"
REMOTE="$2"
SIZE=$(wc -c < "$LOCAL")
B64=$(gzip -c "$LOCAL" | base64 -w0)
n=${#B64}
CH=3000
i=0
part=0
# Part 0: truncate staging file.
~/workspace/bin/pigwsl-exec 'rm -f /tmp/xfer.b64 && echo part0-ok'
while [ $i -lt $n ]; do
  chunk="${B64:$i:$CH}"
  part=$((part + 1))
  # chunk is base64 alphabet only: safe inside double quotes.
  ~/workspace/bin/pigwsl-exec "printf '%s' '$chunk' >> /tmp/xfer.b64 && echo part$part-ok"
  i=$((i + CH))
done
# Final: decode, verify byte count, clean up.
CMD='mkdir -p "$(dirname "'"$REMOTE"'")"'
CMD+=$'\nbase64 -d /tmp/xfer.b64 | gunzip > '"$REMOTE"
CMD+=$'\nrm -f /tmp/xfer.b64'
CMD+=$'\ngot=$(wc -c < "'"$REMOTE"'")'
CMD+=$'\nif [ "$got" = "'"$SIZE"'" ]; then echo "OK '"$REMOTE"' $got bytes"; else echo "MISMATCH '"$REMOTE"' got=$got want='"$SIZE"'"; exit 1; fi'
~/workspace/bin/pigwsl-exec "$CMD"
