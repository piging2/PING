#!/usr/bin/env bash
# GW-BUILD Phase C: syntax + tsc + the three scratch proofs against the worktree.
# Exits non-zero on any failure.
set -u
WT=/home/nolan/ping/worktrees/gw-repair-build
B=/tmp/gw-build
echo "=== C1. node --check on touched files ==="
for f in gateway/exterior_auth_middleware.js gateway/bootstrap/gateway_runtime.js \
         gateway/routes/events.js ping-runtime/workers/canonical_workers.js \
         ping-runtime/events/event_bridge.js; do
  node --check "$WT/$f" || { echo "SYNTAX FAIL $f"; exit 1; }
  echo "OK $f"
done
echo "=== C2. tsc constitutional sources (Dockerfile's exact step, isolated) ==="
rm -rf /tmp/tsc-check /tmp/tsc-out && mkdir -p /tmp/tsc-check /tmp/tsc-out
cd /tmp/tsc-check && npm init -y >/dev/null 2>&1 && npm i --no-audit --no-fund typescript @types/node >/dev/null 2>&1
./node_modules/.bin/tsc \
  "$WT/runtime/constitutional/src/identity-authority.ts" \
  "$WT/runtime/constitutional/src/hash-authority.ts" \
  "$WT/runtime/constitutional/src/ping-vocabulary.ts" \
  --outDir /tmp/tsc-out --module commonjs --target es2020 \
  --esModuleInterop --skipLibCheck --types node \
  || { echo "TSC FAIL"; exit 1; }
echo "TSC OK"
echo "=== C3a. repro-witness-remint (W-1) ==="
JEV_SURGICAL="$WT" node "$B/repro-witness-remint.mjs" || { echo "W-1 GATE FAIL"; exit 1; }
echo "=== C3b. gate-replay-converge (W-2) ==="
JEV_SURGICAL="$WT" node "$B/gate-replay-converge.mjs" || { echo "W-2 GATE FAIL"; exit 1; }
echo "=== C3c. Lane H ht-bridge-laundering (P3) ==="
sed "s|require('./fixed-tree/ping-runtime/events/event_bridge.js')|require('$WT/ping-runtime/events/event_bridge.js')|" \
  "$B/ht-bridge-laundering.fixed.cjs" > "$B/ht-bridge-laundering.gwbuild.cjs"
node "$B/ht-bridge-laundering.gwbuild.cjs" || { echo "P3 HARNESS FAIL"; exit 1; }
echo "=== PHASE C COMPLETE ==="
