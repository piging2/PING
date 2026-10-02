#!/bin/bash
cd /home/nolan/ping
echo "=== bootstrap 330-362 ==="; sed -n '330,362p' gateway/bootstrap/gateway_runtime.js
echo "=== executionEngine used later ==="; grep -n "executionEngine" gateway/bootstrap/gateway_runtime.js | head -20
echo "=== worker_port.js head ==="; head -100 ping-runtime/orchestration/execution/worker_port.js
