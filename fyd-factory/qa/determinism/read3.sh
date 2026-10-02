#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== render-model.ts (100 lines) ==="
head -140 src/fyd/sitespec/render-model.ts
echo ""
echo "=== planSite signature ==="
grep -n "export function planSite\|export interface SitePlannerInput\|export type PlannedSite\|export interface PlannedSite" src/fyd/builder/planner.ts
sed -n '/export interface SitePlannerInput/,/^}/p' src/fyd/builder/planner.ts
