#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "generateSiteSpec" src/fyd --include=*.ts -l | head
echo ===
grep -rn "SiteSpec" src/fyd/builder/planner.ts | head -20
echo ===
grep -rn "buildRenderContext" src -l | head
echo ===
grep -rln "generateSiteSpec" ~/workspace/fyd-factory --include=*.sh --include=*.py --include=*.md | head
