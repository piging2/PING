#!/bin/bash
cd /home/nolan/ping
echo "=== tool_authority.js ==="; wc -l gateway/tool_authority.js; head -80 gateway/tool_authority.js
echo "=== tool_authority importers ==="; grep -rln "tool_authority" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v "tool_authority.js" | head -8
