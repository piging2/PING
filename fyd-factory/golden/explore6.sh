#!/bin/bash
echo "=== what serves :3100 ==="
ps aux | grep -i "next-server\|next dev" | grep -v grep | head -5
ls -la /home/nolan/fyd-dev-3100.log 2>/dev/null && tail -20 /home/nolan/fyd-dev-3100.log
echo "=== Generated site demo fallback in repo ==="
grep -rn "Generated site demo" /home/nolan/projects/ping/src/ 2>/dev/null | head -5
echo "=== happy-place tenant graph data ==="
grep -n "happy-place" /home/nolan/projects/ping/src/fyd/data/fyd-tenant-graph.ts | head -10
wc -l /home/nolan/projects/ping/src/fyd/data/fyd-tenant-graph.ts /home/nolan/projects/ping/src/fyd/data/ping-object-source.ts
