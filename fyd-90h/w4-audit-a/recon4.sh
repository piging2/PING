#!/bin/bash
# W4 Audit A - recon4: PING dogfood render tests (the 4+4 failures) + TESTING.md context
set -u
WT=/tmp/w4-audit-ping
echo "=== A. TESTING.md lines 40-80 ==="
sed -n '40,80p' "$WT/TESTING.md"
echo "=== B. dogfood render test head ==="
head -100 "$WT/src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts" 2>/dev/null
echo "=== C. dogfood components test head ==="
head -80 "$WT/src/fyd/components/__tests__/ping-fyd-dogfood.test.ts" 2>/dev/null
echo "=== D. test file sizes ==="
wc -l "$WT/src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts" "$WT/src/fyd/components/__tests__/ping-fyd-dogfood.test.ts" 2>/dev/null
