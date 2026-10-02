#!/bin/bash
# W4 Audit A - recon9: did owner-asserted ever exist in code? what does the HEAD loader do with it?
set -u
WT=/tmp/w4-audit-ping
echo "=== A. git log -S owner-asserted ==="
git -C "$WT" log --oneline -S "owner-asserted" -- src/ | head -10
echo "=== B. ping-object-source.ts: provenance handling ==="
grep -n "provenance\|kind" "$WT/src/fyd/data/ping-object-source.ts" | head -30
echo "=== C. who writes ping-fyd.json (dumper on HEAD)? ==="
grep -rn "ping-fyd.json\|fyd-dogfood-builder" "$WT/src" "$WT/scripts" "$WT/tools" 2>/dev/null | grep -v __tests__ | head -10
echo "=== D. planner binding classification for business title ==="
grep -rn "classification.*direct\|\"direct\"" "$WT/src/fyd/builder/planner.ts" "$WT/src/fyd/sitespec/graph.ts" 2>/dev/null | head -15
