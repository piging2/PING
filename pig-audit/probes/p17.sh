#!/bin/bash
cd /home/nolan/ping
echo "=== event_queue.js: persistence? ==="
grep -nE "require\(|fs\.|pg|query|INSERT|writeFile" ping-runtime/orchestration/execution/event_queue.js | head -15
echo "=== mission ID generation in mission_compiler.js ==="
grep -n "mission_\|uuid\|randomUUID\|crypto" ping-runtime/orchestration/execution/mission_compiler.js | head -10
echo "=== kernel_replay_execution_provider.js ==="
sed -n '1,50p' gateway/kernel_replay_execution_provider.js
echo "=== python worker_protocol: how workers execute ==="
grep -nE "ExecutionAuthority|subprocess|run_command|\.run\(" runtime/cognitive/worker_protocol.py | head -20
echo "=== gateway listen port + python HTTP ports ==="
sed -n '810,825p' gateway/bootstrap/gateway_runtime.js
grep -rn "uvicorn\|Flask\|FastAPI\|app.run\|8000\|8080" --include="*.py" runtime/constitutional_runtime.py runtime/supervisor.py 2>/dev/null | head -8
