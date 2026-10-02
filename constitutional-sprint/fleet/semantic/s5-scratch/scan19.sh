#!/bin/bash
cd /home/nolan/ping
echo "=== authz in mission path? ==="; grep -rni "authoriz\|authenticate\|permission\|capabilit" ping-runtime/orchestration/mission_scheduler.js ping-runtime/workers/worker_runtime.js | grep -vi "AgentCapabilities" | head -20
echo "=== tool_router.py ==="; wc -l runtime/tool_router.py; head -100 runtime/tool_router.py
echo "=== canonical_workers 8 workers ==="; grep -n "register(\|eventTypes" ping-runtime/workers/canonical_workers.js | head -40
