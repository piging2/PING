#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== fyd/object dir ====="
ls src/fyd/object/
echo "===== owner-overlay.ts ====="
cat src/fyd/object/owner-overlay.ts 2>/dev/null | head -120
echo "===== OwnerFieldCorrection type ====="
grep -n "OwnerFieldCorrection" -B2 -A 25 src/lib/ping/types.ts | head -60
