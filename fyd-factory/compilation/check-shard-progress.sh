#!/bin/bash
# progress check for shards C-F
uptime
for x in c d e f; do
  n=$(ls /home/nolan/fyd-compile-harness/results-shard-$x 2>/dev/null | wc -l)
  t=$(tail -1 /home/nolan/fyd-compile-harness/shard-$x.log 2>/dev/null | cut -c1-110)
  echo "$x: result-files=$n last-log=$t"
done
