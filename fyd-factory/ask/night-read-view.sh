#!/bin/bash
cd /home/nolan/projects/ping
echo "=== does buildGraphView filter visibility? ==="
grep -n "visibility" src/fyd/ask/concierge.ts | head -20
echo ""
echo "=== UNKNOWN_PROBES ==="
grep -n "UNKNOWN_PROBES" -A 40 src/fyd/ask/concierge.ts | sed -n '1,60p'
