#!/bin/bash
cd /home/nolan/projects/ping
echo "########## verifiedRenderModel consumers ##########"
grep -rn "\.verifiedRenderModel\|verifiedRenderModel?" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo
echo "########## PingObject provenance field ##########"
grep -n "provenance" src/lib/ping/types.ts | head -10
grep -n "interface PingObject" -A 40 src/lib/ping/types.ts | sed -n '1,45p'
echo
echo "########## generateSiteSpec signature ##########"
grep -n "export function generateSiteSpec" -A 10 src/fyd/proceduralize/generator.ts | head -15
echo
echo "########## SitePageView signature ##########"
grep -n "export function SitePageView\|export interface RenderContext\|interface RenderContext" -A 12 src/fyd/components/renderer.tsx | head -40
