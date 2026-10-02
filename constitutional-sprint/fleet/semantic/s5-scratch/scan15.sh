#!/bin/bash
cd /home/nolan/ping
echo "=== registerCanonicalWorkers file ==="; grep -rln "function registerCanonicalWorkers\|const registerCanonicalWorkers" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | head
echo "=== capabilities consulted anywhere ==="; grep -rn "capabilities" ping-runtime/workers/worker_runtime.js | head; echo ---; grep -rln "\.capabilities" --include='*.js' ping-runtime/ gateway/ 2>/dev/null | grep -v node_modules | head -20
echo "=== BaseWorker file ==="; ls ping-runtime/workers/ | head -30
