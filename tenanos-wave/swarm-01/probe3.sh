#!/bin/bash
# SWARM-01 probe 3: execution substrate inventory (read-only)
cd /home/nolan/projects/ping
echo "=== ORCA ==="
grep -rl "orca" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" --include="*.md" src scripts data 2>/dev/null | grep -vi node_modules | head -30
echo "=== MISSION ENGINE / RUNS ==="
grep -rli "mission" --include="*.ts" src/lib src/services 2>/dev/null | head -20
echo "=== MCP ==="
grep -rli "mcp" --include="*.ts" --include="*.tsx" src 2>/dev/null | grep -vi node_modules | head -20
echo "=== QDRANT ==="
grep -rli "qdrant" --include="*.ts" --include="*.tsx" --include="*.py" src scripts 2>/dev/null | grep -vi node_modules | head -20
echo "=== GATEWAY refs ==="
grep -rli "gateway" --include="*.ts" src 2>/dev/null | grep -vi node_modules | head -20
echo "=== data/ dir ==="
ls -R data 2>/dev/null | head -50
echo "=== scripts/ dir ==="
ls scripts 2>/dev/null | head -60
echo "=== PORT 3100 listener ==="
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E "3100|3000" | head
echo "=== package.json scripts ==="
python3 -c "import json; d=json.load(open('package.json')); print('\n'.join(f'{k}: {v}' for k,v in d.get('scripts',{}).items()))" 2>/dev/null | head -40
