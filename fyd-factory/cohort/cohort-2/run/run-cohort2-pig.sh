#!/bin/bash
# run-cohort2-pig.sh: execute the COHORT-2 runner on the Pig (read-only wrt repo).
# Runs against the pristine worktree at /home/nolan/cohort2-pristine (detached HEAD e48ef710).
set -e
cd /home/nolan/cohort2-pristine
OBSERVED="$1"
echo "observed_at=$OBSERVED"
echo "worktree_head=$(git rev-parse HEAD)"
NODE_OPTIONS="--import /home/nolan/css-register.mjs" ./node_modules/.bin/tsx /home/nolan/cohort2-run.mts \
  /home/nolan/cohort2-raw /home/nolan/cohort2-sites.json "$OBSERVED" /home/nolan/cohort2-out
echo "=== output ==="
ls -la /home/nolan/cohort2-out/
