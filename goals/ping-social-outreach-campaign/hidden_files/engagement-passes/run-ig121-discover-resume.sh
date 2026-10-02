#!/bin/bash
# Pass 121 discovery RESUME (ig-20260924-1301): the first runner died after the
# tradecity strategy (shell reaped; flock released automatically). Resume the
# two remaining strategies (hashtag, bizlocal) under a fresh lock. Attempt 2
# of discovery per the browser/CDP recovery budget (max 2 attempts/pass).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260924-1301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass121-discovery-resume" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

for s in hashtag bizlocal; do
  JOB="$SRC/ig121-discover-$s-$TS.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
