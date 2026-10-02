#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== verifyObjectGraph ==="
grep -n "export function verifyObjectGraph\|export interface VerifyInput\|export interface GraphAttestation\|ObjectBuilderCode" src/fyd/builder/object-builder.ts | head -20
sed -n '/export function verifyObjectGraph/,+80p' src/fyd/builder/object-builder.ts | head -100
echo ""
echo "=== planSite signature ==="
grep -n "export function planSite" -A 40 src/fyd/builder/planner.ts | head -60
