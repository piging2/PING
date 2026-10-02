#!/bin/bash
cd /home/nolan/ping
echo "=== reasoning_gateway callers ==="; grep -rln "reasoning_gateway\|from .supervisor import\|from runtime.cognitive" --include='*.py' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | head -10
echo "=== intent_graph_builder exists? ==="; ls scripts/ | grep -i intent | head; echo ---; grep -rn "def generate_indexes\|intent-manifest\|intent/" scripts/intent_graph_builder.py 2>/dev/null | head -15
echo "=== mission_compiler patch/commit ==="; grep -n "git\|commit\|patch" ping-runtime/orchestration/execution/mission_compiler.js | head -20
