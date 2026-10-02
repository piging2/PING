#!/bin/bash
cd /home/nolan/ping
echo "=== QUEUE_DIR ==="
grep -n "QUEUE_DIR" ping-runtime/orchestration/execution/event_queue.js | head -3
echo "=== legacy execution_authority requires ==="
grep -rn "execution_authority\|local_first_execution\|mission_execution_authority\|parallel_execution_authority\|execution_graph_authority\|execution_plan_authority" --include="*.js" gateway/bootstrap gateway/routes ping-runtime | grep -v "generated" | head -10
echo "=== gateway start port: who calls start() ==="
grep -rn "\.start(" --include="*.js" gateway/bootstrap/ | head -5; grep -n "PORT" gateway/Dockerfile docker-compose*.yml 2>/dev/null | head -8; ls docker-compose*.yml 2>/dev/null
echo "=== python calling JS gateway HTTP? ==="
grep -rn "localhost:3\|localhost:8\|127.0.0.1" --include="*.py" runtime/supervisor.py runtime/constitutional_runtime.py runtime/cognitive/worker_protocol.py runtime/tool_router.py 2>/dev/null | head -10
echo "=== JS calling python service HTTP? ==="
grep -rn "localhost:5\|localhost:8[0-9][0-9][0-9]" --include="*.js" gateway/bootstrap gateway/routes ping-runtime/orchestration 2>/dev/null | head -10
