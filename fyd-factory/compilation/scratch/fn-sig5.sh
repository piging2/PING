#!/bin/bash
cd /home/nolan/projects/ping
sed -n '180,225p' src/fyd/components/renderer.tsx
echo ===
grep -n "severity\|FYDFinding" src/fyd/sitespec/types.ts | head
sed -n '/export interface FYDFinding/,/^}/p' src/fyd/sitespec/types.ts | head -15
echo ===
grep -n "export interface PingRelationship" -A 15 src/lib/ping/types.ts | head -20
grep -n "export interface PingObject" -A 25 src/lib/ping/types.ts | head -30
