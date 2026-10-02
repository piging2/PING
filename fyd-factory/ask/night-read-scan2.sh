#!/bin/bash
cd /home/nolan/projects/ping
sed -n '671,706p' src/fyd/ask/concierge.ts
echo ""
echo "=== collectFieldValues ==="
grep -n "function collectFieldValues" -A 20 src/fyd/ask/concierge.ts | head -25
