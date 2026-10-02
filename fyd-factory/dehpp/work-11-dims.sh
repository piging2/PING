#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== dimensions policyForVector ==="
grep -n "policyForVector\|ctaEmphasis\|sectionOrder\|CompositionPolicy\|export function\|export interface" src/fyd/builder/dimensions.ts | head -30
echo ""
echo "=== site-vectors.ts exports ==="
grep -n "^export" src/fyd/builder/site-vectors.ts | head -20
echo ""
echo "=== TenantContext ==="
grep -rn "interface TenantContext" src/fyd/builder/*.ts | head -5
