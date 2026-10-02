#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== section query construction in builder lane ==="
grep -rn "query:" src/fyd/builder --include="*.ts" | grep -v __tests__ | head -20
echo "=== archetypes/profiles.ts ObjectFeed ==="
grep -n -B2 -A8 "ObjectFeed" src/fyd/archetypes/profiles.ts | head -40
