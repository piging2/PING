#!/bin/bash
cd /home/nolan/ping
echo "=== gateway_runtime imports from execution/ ==="; grep -n "orchestration/execution\|ExecutionEngine\|CapabilityRegistry" gateway/bootstrap/gateway_runtime.js | head -20
echo "=== new ExecutionEngine anywhere ==="; grep -rn "new ExecutionEngine" --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | head
echo "=== orchestration/index.js ==="; head -60 ping-runtime/orchestration/index.js; echo; wc -l ping-runtime/orchestration/index.js
echo "=== capability_registry.json (dirty) ==="; cat ping-runtime/orchestration/execution/capability_registry.json
