#!/bin/bash
cd /home/nolan/projects/ping
sed -n '285,340p' src/fyd/proceduralize/generator.ts
echo ===
grep -n "buildRenderContext\|export function" src/fyd/components/renderer.tsx | head -20
echo ===
grep -n "export function validateSiteSpec" -A 25 src/fyd/sitespec/validator.ts | head -35
echo ===
grep -n "FYDSiteSpec\b" src/fyd/sitespec/types.ts | head
sed -n '/export interface FYDSiteSpec/,/^}/p' src/fyd/sitespec/types.ts | head -40
echo ===
grep -n "export interface ObjectGraph\|export type ObjectGraph" -A 12 src/fyd/sitespec/types.ts | head -20
