#!/bin/bash
# run-cohort-pig.sh: execute the NIGHT-COHORT runner on the Pig (read-only wrt repo).
set -e
cd /home/nolan/projects/ping
OBSERVED=$(date -u +%FT%TZ)
echo "observed_at=$OBSERVED"
echo "branch=$(git rev-parse --abbrev-ref HEAD) head=$(git rev-parse --short HEAD)"
# tsx bin (sets up CJS+ESM hooks); NODE_OPTIONS registers the asset stub so the
# render-model check can load the renderer.tsx chain headlessly.
NODE_OPTIONS="--import /home/nolan/css-register.mjs" ./node_modules/.bin/tsx /home/nolan/cohort-run.mts \
  /home/nolan/cohort-raw /home/nolan/cohort-sites.json "$OBSERVED" /home/nolan/cohort-out
echo "=== output ==="
ls -la /home/nolan/cohort-out/
