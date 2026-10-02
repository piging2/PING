#!/bin/bash
# W4 Audit A - recon10: HEAD dumper provenance kind + planner classification logic
set -u
WT=/tmp/w4-audit-ping
echo "=== A. dumper provenance emission (HEAD) ==="
grep -n "provenance\|kind" "$WT/src/fyd/builder/dogfood/build-ping-fyd-projection.mjs" | head -20
echo "=== B. planner.ts lines 420-470 ==="
sed -n '420,470p' "$WT/src/fyd/builder/planner.ts"
echo "=== C. does planner ever emit owner_authored? ==="
grep -n "owner_authored" "$WT/src/fyd/builder/planner.ts" | head -10
echo "=== D. 25caf3c5: owner-asserted in code history ==="
git -C "$WT" show 25caf3c5 --stat | head -8
git -C "$WT" log --oneline --all -S "owner-asserted" -- src/lib/ping/types.ts | head
