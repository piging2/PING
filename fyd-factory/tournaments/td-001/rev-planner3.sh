#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== planner.ts:400-480 (section construction + query origin) ==="
sed -n '400,480p' src/fyd/builder/planner.ts
echo "=== strategies.ts:70-170 ==="
sed -n '70,170p' src/fyd/builder/strategies.ts
