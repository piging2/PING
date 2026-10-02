#!/bin/bash
# W4 Audit A - recon2: PING tenant definition, ask route, approval on HEAD
set -u
WT=/tmp/w4-audit-ping
echo "=== A. ping-social tenant references ==="
grep -rln "ping-social\|ping_social" "$WT/src/fyd/tenant/" "$WT/src/fyd/data/" 2>/dev/null | head -10
echo "=== B. tenant-context.ts head ==="
head -80 "$WT/src/fyd/tenant/tenant-context.ts"
echo "=== C. ask route (ping) ==="
cat "$WT/src/app/api/ping/ask/route.ts"
echo "=== D. customize dir ==="
ls "$WT/src/fyd/customize/" "$WT/src/fyd/owner-mode/" 2>/dev/null
echo "=== E. dogfood generator broad search ==="
grep -rln "dogfood" "$WT/scripts" "$WT/tools" "$WT/docs" 2>/dev/null | head -10
grep -rln "ping-fyd-home\|fyd-dogfood" "$WT" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.sh" --include="*.md" 2>/dev/null | grep -v node_modules | head -10
