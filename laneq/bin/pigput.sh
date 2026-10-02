#!/bin/bash
# usage: pigput.sh <local-src> <remote-path>
src="$1"; r="$2"
b64=$(base64 -w0 "$src")
printf 'base64 -di > "%s" <<'"'"'B64EOF'"'"'\n%s\nB64EOF\n' "$r" "$b64" > ~/workspace/laneq/bin/put.sh
for i in $(seq 1 8); do
  out=$(~/workspace/laneq/bin/pigw.sh ~/workspace/laneq/bin/put.sh 2>~/workspace/laneq/bin/pigput.err); rc=$?
  if [ $rc -eq 0 ]; then echo "pushed $src -> $r"; exit 0; fi
  sleep 8
done
cat ~/workspace/laneq/bin/pigput.err >&2; exit 1
