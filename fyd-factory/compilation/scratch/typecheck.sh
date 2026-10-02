#!/bin/bash
# Strict typecheck of the harness. Preserves tsc's real exit code
# (set -o pipefail: without it the pipe through head masks failures).
set -o pipefail
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsc --noEmit --strict --skipLibCheck \
  --target es2022 --module nodenext --moduleResolution nodenext \
  --types node \
  "$H/runner/lib.ts" "$H/runner/job-worker.ts" "$H/runner/queue-runner.ts" "$H/runner/chain-proof.ts" 2>&1 | head -30
echo "tsc exit: ${PIPESTATUS[0]}"
exit "${PIPESTATUS[0]}"
