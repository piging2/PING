#!/bin/bash
cd /home/nolan/ping
echo "=== who writes missions/ workspace.json ==="; grep -rln "workspace.json" --include='*.py' --include='*.js' scripts/ gateway/ ping-runtime/ tools/ 2>/dev/null | grep -v node_modules | head -8
echo "=== d596aa596 content ==="; git show --stat d596aa596 2>/dev/null | head -25
