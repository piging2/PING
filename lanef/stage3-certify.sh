#!/bin/bash
# Lane F stage 3: full release-certify.js sequence, gates 0-7, against the exact snapshot.
set -u
R=/home/nolan/worktrees/constitutional-convergence
cd "$R"
echo "--- preconditions: HEAD and clean tree ---"
git rev-parse HEAD
git status --porcelain
echo "(empty above = clean)"
node tools/distribution/release-certify.js \
  --root "$R" \
  --snapshot /tmp/lanef/snap \
  --classify tools/distribution/classify.json \
  --entrypoints gateway/server.js \
  --dynamic-targets gateway/generated/capability_registry.json,gateway/generated/state_machine_registry.json \
  --migrations ping-runtime/events/unified_event_runtime.js \
  --trigger-policy tools/distribution/trigger-policy.oracle-canonical.json \
  --dockerfile infrastructure/oracle/Dockerfile.gateway \
  --smoke-node-version 20 \
  --fixture-result /tmp/lanef/fixture-adapter.json \
  --workdir /tmp/lanef/cert-work \
  --json-out /tmp/lanef/release-certification-a9cad2663.json 2>&1 | tail -40
echo "RELEASE_CERTIFY_EXIT=${PIPESTATUS[0]}"
