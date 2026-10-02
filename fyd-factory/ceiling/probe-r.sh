#!/bin/bash
# F5-CEILING probe R: find query resolution in render-model.ts
set -e
cd /home/nolan/projects/ping
grep -n "query" src/fyd/sitespec/render-model.ts | head -30
echo "==="
grep -rn "resolveQueryObjects" src/fyd --include="*.ts" | grep -v __tests__ | grep -v "builder/planner" | head
