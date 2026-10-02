#!/bin/bash
R=/home/nolan/ping
echo "===== base_worker.js states ====="
grep -nE "status|state" "$R/ping-runtime/agents/base_worker.js" | grep -viE "health|healthy" | head -25
echo
echo "===== capability_resolver decision states ====="
grep -nE "decision|status|state" "$R/ping-runtime/runtime/capability_resolver.js" | head -25
echo
echo "===== bootstrap: any mission-side startup reconciliation? ====="
grep -nE "reap|reconcil|orphan|startup.*mission|mission.*startup" "$R/gateway/bootstrap/gateway_runtime.js" | head -15
echo
echo "===== worker_port.js states ====="
grep -nE "['\"](pending|running|completed|failed|idle|processing|stale)['\"]" "$R/ping-runtime/agents/worker_port.js" | head -15
echo
echo "===== ping_missions readers: who queries status? ====="
grep -rln "ping_missions" "$R/ping-runtime" "$R/gateway" --include='*.js' 2>/dev/null | grep -v __tests__ | grep -v "test_" | head -15
