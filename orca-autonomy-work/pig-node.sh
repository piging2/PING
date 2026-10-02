#!/bin/bash
# pig-node.sh: run a local node script inside the ping-gateway container on the Pig,
# with POSTGRES_PASSWORD injected from the container env (never printed/stored).
# Usage: pig-node.sh <local-js-file> [args...]
set -euo pipefail
LOCAL="$1"; shift || true
REMOTE="/tmp/orca-autonomy-$(basename "$LOCAL")"
~/workspace/orca-autonomy-work/pig-put.sh "$LOCAL" "$REMOTE" >/dev/null
RUN=~/workspace/pig/pigwsl-run.sh
"$RUN" "docker cp '$REMOTE' ping-gateway:'$REMOTE'"
"$RUN" "docker exec -e POSTGRES_PASSWORD=\$(docker exec ping-gateway printenv POSTGRES_PASSWORD) ping-gateway node '$REMOTE' $*"
