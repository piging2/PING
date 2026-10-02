#!/bin/bash
# Lane F stage 3b: release-certify with --root pinned to a pristine a9cad2663 checkout
# (the shared worktree moved to convergence-discovery-2026-09-20 @ ed0de7edd
# during certification; the candidate is SHA-pinned, so the root is re-pinned).
set -u
R=/home/nolan/worktrees/constitutional-convergence
CROOT=/tmp/lanef/candidate-root
if [ ! -d "$CROOT/.git" ]; then
  cd "$R"
  git worktree add --detach "$CROOT" a9cad266353679a90e54b318100efb8153ea988e
fi
echo "--- candidate root ---"
git -C "$CROOT" rev-parse HEAD
git -C "$CROOT" status --porcelain
echo "(empty above = clean)"
node "$R/tools/distribution/release-certify.js" \
  --root "$CROOT" \
  --snapshot /tmp/lanef/snap \
  --classify "$R/tools/distribution/classify.json" \
  --entrypoints gateway/server.js \
  --dynamic-targets gateway/generated/capability_registry.json,gateway/generated/state_machine_registry.json \
  --migrations ping-runtime/events/unified_event_runtime.js \
  --trigger-policy "$R/tools/distribution/trigger-policy.oracle-canonical.json" \
  --dockerfile "$R/infrastructure/oracle/Dockerfile.gateway" \
  --smoke-node-version 20 \
  --fixture-result /tmp/lanef/fixture-adapter.json \
  --workdir /tmp/lanef/cert-work \
  --json-out /tmp/lanef/release-certification-a9cad2663.json 2>&1 | tail -30
echo "RELEASE_CERTIFY_EXIT=${PIPESTATUS[0]}"
