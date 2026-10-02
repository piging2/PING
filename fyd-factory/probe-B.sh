#!/bin/bash
# LANE-ARCH probe B: full src/fyd file map + export symbols of key modules (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== FILE COUNT per dir under src/fyd ==="
find src/fyd -type f | sed 's|src/fyd/||' | awk -F/ '{if (NF>1) print $1; else print "(root)"}' | sort | uniq -c | sort -rn
echo "=== FULL FILE LIST src/fyd (relative) ==="
find src/fyd -type f | sort
echo "=== src non-fyd top dirs detail ==="
for d in src/lib src/services src/config src/components src/types src/content data; do
  echo "--- $d ---"
  ls -1 "$REPO/$d" 2>/dev/null | head -40
done
