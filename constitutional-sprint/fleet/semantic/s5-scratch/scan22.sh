#!/bin/bash
cd /home/nolan/ping
echo "=== runtime/supervisor.py spawn callers ==="; grep -rn "supervisor.py" --include='*.py' --include='*.js' --include='*.sh' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | grep -v cognitive | head -10
echo "=== cognitive/supervisor.py ==="; wc -l runtime/cognitive/supervisor.py; head -70 runtime/cognitive/supervisor.py
echo "=== intent_graph_builder sources ==="; grep -n "intent/\|intents/" scripts/intent_graph_builder.py 2>/dev/null | head -10
