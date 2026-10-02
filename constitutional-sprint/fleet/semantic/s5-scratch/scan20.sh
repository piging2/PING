#!/bin/bash
cd /home/nolan/ping
echo "=== tool_router callers ==="; grep -rn "tool_router" --include='*.py' --include='*.js' --include='*.sh' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | grep -v "tool_router.py:" | head -10
echo "=== runtime/tools ==="; ls runtime/tools/ 2>/dev/null | head -20
echo "=== execution_authority.py run_command ==="; grep -n "def run_command\|def \|class " runtime/authorities/execution_authority.py | head -20
echo "=== test_mission_graph.py head ==="; head -60 tests/test_mission_graph.py
