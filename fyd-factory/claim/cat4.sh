#!/bin/bash
cd /home/nolan/projects/ping
echo "########## renderer.tsx verifiedRenderModel refs ##########"
grep -n "verifiedRenderModel\|VerifiedRenderModel" src/fyd/components/renderer.tsx | head -20
echo "=== full-repo refs ==="
grep -rn "verifiedRenderModel" src --include="*.ts" --include="*.tsx" -l | sort
echo
echo "########## slotBindingsForVerification full ##########"
sed -n '252,300p' src/fyd/builder/planner.ts
echo
echo "########## generated-presentation.ts key types ##########"
grep -n "export interface\|export function\|export type\|claimRef" src/fyd/builder/generated-presentation.ts | head -40
