#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== planner.ts:300-360 (section emission) ==="
sed -n '300,360p' src/fyd/builder/planner.ts
echo "=== eligibility.ts ObjectFeed eligibility (180-210) ==="
sed -n '180,210p' src/fyd/builder/eligibility.ts
