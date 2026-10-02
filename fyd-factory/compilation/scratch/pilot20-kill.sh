#!/bin/bash
# pilot20 phase 2 (run locally): wait for the victim's progress marker
# (5 result files = first batch committed), snapshot them, then SIGKILL.
# No blind sleep: we poll the victim's own output, never a timer.
H=/home/nolan/fyd-compile-harness
MARK="$H/results-pilot20"
for i in $(seq 1 120); do
  N=$(~/workspace/bin/wsl-run.sh ~/workspace/fyd-factory/compilation/scratch/count-results.sh 30 2>/dev/null | tail -1)
  echo "poll $i: $N results"
  if [ "$N" = "5" ]; then
    echo "progress marker reached: 5 results committed; snapshotting and killing runner"
    ~/workspace/bin/wsl-run.sh ~/workspace/fyd-factory/compilation/scratch/snapshot5.sh 30
    RPID=$(~/workspace/bin/wsl-run.sh ~/workspace/fyd-factory/compilation/scratch/read-pid.sh 30 2>/dev/null | tail -1)
    echo "killing runner pid $RPID"
    ~/workspace/bin/wsl-run.sh ~/workspace/fyd-factory/compilation/scratch/kill-pid.sh 30
    exit 0
  fi
  sleep 1
done
echo "TIMEOUT waiting for 5 results"
exit 1
