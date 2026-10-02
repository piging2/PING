#!/bin/bash
cd /home/nolan/ping
echo "=== supervisor.py ==="; wc -l runtime/supervisor.py; head -80 runtime/supervisor.py
echo "=== supervisor callers ==="; grep -rn "supervisor" --include='*.py' --include='*.js' --include='*.sh' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | grep -iv "runtime/supervisor.py" | grep -i "supervisor.py\|from.*supervisor\|require.*supervisor" | head -10
echo "=== which intent registry scripts read ==="; grep -n "intent" scripts/intent_cli.py | head -15; echo ---; grep -n "intent" scripts/mission_graph.py | head -15
