#!/bin/bash
# SWARM-01 probe 6: read gateway tenant route + MCP server + find auth middleware (read-only)
echo "########## gateway/routes/tenants.js ##########"
cat /home/nolan/ping/gateway/routes/tenants.js 2>/dev/null | head -150
echo "########## mcp/ping_mcp_server.py ##########"
cat /home/nolan/ping/mcp/ping_mcp_server.py 2>/dev/null
echo "########## auth middleware files ##########"
find /home/nolan/ping/gateway -iname "*auth*" -not -path "*/node_modules/*" 2>/dev/null | head -20
find /home/nolan/ping -maxdepth 2 -iname "*auth*" -not -path "*/node_modules/*" 2>/dev/null | head -20
