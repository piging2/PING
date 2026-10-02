#!/bin/bash
cd /home/nolan/projects/ping
echo "=== visibility gate ==="
find src -path "*builder/visibility*" -o -path "*field-visibility*" | head -5
grep -rn "visibility" src/fyd/builder/visibility* 2>/dev/null | head -20
echo "=== ==="
grep -rln "field-visibility\|fieldVisibility" src/fyd/sitespec/ | head -5
