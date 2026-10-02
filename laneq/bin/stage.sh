#!/bin/bash
# usage: stage.sh <localfile> <staging-name>  -- scp to Pig Windows staging dir
src="$1"; name="$2"
for i in $(seq 1 6); do
  scp -F /home/hatch/.ssh/pig-config -o ConnectTimeout=20 "$src" "pigwsl:C:/Users/nolan/laneq-stage/$name" 2>~/workspace/laneq/bin/stage.err && { echo "staged $name"; exit 0; }
  sleep 8
done
cat ~/workspace/laneq/bin/stage.err >&2; exit 1
