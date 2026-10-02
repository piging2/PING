#!/bin/bash
# SWARM-01 probe 5: /home/nolan/ping substrate inventory (read-only)
echo "=== /home/nolan/ping top ==="
ls /home/nolan/ping/ | head -50
echo "=== gateway dir ==="
ls -la /home/nolan/ping/gateway/ 2>/dev/null | head -30
echo "=== mcp dir ==="
ls -la /home/nolan/ping/mcp/ 2>/dev/null | head -30
echo "=== tenant refs in gateway ==="
grep -ril "tenant" /home/nolan/ping/gateway/ 2>/dev/null | head -20
echo "=== tenant refs in mcp ==="
grep -ril "tenant" /home/nolan/ping/mcp/ 2>/dev/null | head -20
echo "=== event runtime ==="
ls /home/nolan/ping/ | grep -i -E "event|runtime|mission|run|orchestr" | head -20
find /home/nolan/ping -maxdepth 2 -iname "*event*" -not -path "*/node_modules/*" 2>/dev/null | head -20
