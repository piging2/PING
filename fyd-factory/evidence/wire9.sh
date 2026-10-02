#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== resolveQuery export ====="
grep -n "export function resolveQuery" -A 12 src/fyd/components/renderer.tsx | head -20
echo "===== SpecBindingVerdict export ====="
grep -n "SpecBindingVerdict" src/fyd/sitespec/binding-verifier.ts | head -8
echo "===== FYDQuery type ====="
grep -n "interface FYDQuery\|type FYDQuery" src/fyd/sitespec/types.ts | head -3
echo "===== section type has query? ====="
grep -n "interface FYDSection" -A 15 src/fyd/sitespec/types.ts | head -20
echo "===== page type ====="
grep -n "interface FYDPage" -A 12 src/fyd/sitespec/types.ts | head -16
