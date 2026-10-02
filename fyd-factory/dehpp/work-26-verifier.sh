#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== binding-verifier.ts head ==="
sed -n '1,80p' src/fyd/sitespec/binding-verifier.ts
echo ""
echo "=== resolveBoundField ==="
grep -n "resolveBoundField" src/fyd/sitespec/binding-verifier.ts | head -3
sed -n "$(grep -n 'export function resolveBoundField' src/fyd/sitespec/binding-verifier.ts | cut -d: -f1),+45p" src/fyd/sitespec/binding-verifier.ts
