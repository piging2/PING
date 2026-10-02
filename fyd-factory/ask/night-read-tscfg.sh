#!/bin/bash
cd /home/nolan/projects/ping
echo "=== tsconfig paths ==="
grep -A8 '"paths"' tsconfig.json
echo ""
echo "=== PingObject/PingRelationship import path used by concierge ==="
grep -n "from \"../../lib/ping/types\"" src/fyd/ask/concierge.ts | head -2
echo ""
echo "=== site id validation: projections on disk ==="
ls ~/projects/ping/fyd-projections/ 2>/dev/null | head; ls /home/nolan/projects/ping/fyd-projections 2>/dev/null | head
grep -n "function projectionDir" -A 5 src/fyd/data/ping-object-source.ts | head -8
