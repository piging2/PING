#!/bin/bash
cd /home/nolan/ping
echo "=== reasoning_gateway ==="; wc -l runtime/cognitive/reasoning_gateway.py; grep -n "def \|Supervisor(" runtime/cognitive/reasoning_gateway.py | head -15
echo "=== generated generators invoked at runtime? ==="; grep -rn "generated/event_generator\|generated/capability_generator" --include='*.js' gateway/ ping-runtime/ scripts/ 2>/dev/null | grep -v node_modules | grep -v "gateway/generated/" | head -8
echo "=== git ops in gateway ==="; grep -rln "execSync\|child_process" --include='*.js' gateway/ 2>/dev/null | grep -v node_modules | grep -v test | head -10
