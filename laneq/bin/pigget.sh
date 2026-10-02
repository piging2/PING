#!/bin/bash
# usage: pigget.sh <remote-path> <local-dest>
r="$1"; dest="$2"
printf 'base64 -w0 "%s"\n' "$r" > ~/workspace/laneq/bin/get.sh
for i in $(seq 1 8); do
  b64=$(~/workspace/laneq/bin/pigw.sh ~/workspace/laneq/bin/get.sh 2>~/workspace/laneq/bin/pigget.err)
  rc=$?
  if [ $rc -eq 0 ] && [ -n "$b64" ]; then printf '%s' "$b64" | base64 -di > "$dest"; echo "pulled -> $dest ($(wc -c < "$dest") bytes)"; exit 0; fi
  sleep 8
done
cat ~/workspace/laneq/bin/pigget.err >&2; exit 1
