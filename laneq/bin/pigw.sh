#!/bin/bash
# usage: pigw.sh <local-script-file>  -- runs it as bash inside Pig WSL, with retries
script="$1"
b64=$(base64 -w0 "$script")
for i in $(seq 1 8); do
  out=$(ssh -F /home/hatch/.ssh/pig-config -o ConnectTimeout=20 pigwsl "wsl bash -c \"echo $b64 | base64 -di | bash\"" 2>~/workspace/laneq/bin/pigw.err)
  rc=$?
  if [ $rc -eq 0 ]; then printf '%s\n' "$out"; exit 0; fi
  sleep 8
done
cat ~/workspace/laneq/bin/pigw.err >&2
exit 1
