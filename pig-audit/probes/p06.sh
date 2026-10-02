#!/bin/bash
cd /home/nolan/ping
echo "=== callers of dispatchToAssignment / collectWorkerOutput ==="
grep -rn "dispatchToAssignment\|collectWorkerOutput" --include="*.js" ping-runtime gateway | grep -v "engine.js" | head -20
echo "=== gateway_runtime.js size and head ==="
wc -l gateway/bootstrap/gateway_runtime.js
echo "=== where ExecutionEngine is required in gateway ==="
grep -rln "execution/engine" --include="*.js" gateway ping-runtime | head -20
