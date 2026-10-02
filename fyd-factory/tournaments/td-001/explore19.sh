#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== strategies.ts ObjectFeed ====="
grep -n -B3 -A10 "ObjectFeed" src/fyd/builder/strategies.ts | head -60
echo "===== dimensions.ts ObjectFeed ====="
grep -n -B3 -A8 "ObjectFeed" src/fyd/builder/dimensions.ts | head -40
echo "===== eligibility feedable ====="
sed -n '190,210p' src/fyd/builder/eligibility.ts
echo "===== profiles.ts ObjectFeed ====="
grep -n -B3 -A8 "ObjectFeed" src/fyd/archetypes/profiles.ts | head -40
