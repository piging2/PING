#!/bin/bash
cd /home/nolan/ping
echo "=== orchestration/execution/ ==="; ls -la ping-runtime/orchestration/execution/ | head -40
echo "=== who imports execution engine ==="; grep -rln "orchestration/execution\|require.*execution/engine\|from.*execution" --include='*.js' --include='*.py' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v 'orchestration/execution/' | head -20
echo "=== engine.js head ==="; wc -l ping-runtime/orchestration/execution/engine.js; head -80 ping-runtime/orchestration/execution/engine.js
