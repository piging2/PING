#!/bin/bash
cd /home/nolan/ping
echo "=== provider class definition ==="; grep -rn "class KernelReplayExecutionProvider" --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | head -3
echo "=== how bootstrap builds it ==="; grep -n "KernelReplayExecutionProvider" gateway/bootstrap/gateway_runtime.js | head -5
echo "=== provider wiring in canonical_workers ==="; sed -n '215,255p' ping-runtime/workers/canonical_workers.js
