#!/bin/bash
# W4 Audit A - recon7: exact refusal rule in binding-verifier + graph binding declaration
set -u
WT=/tmp/w4-audit-ping
echo "=== A. verifier lines 230-300 ==="
sed -n '230,300p' "$WT/src/fyd/sitespec/binding-verifier.ts"
echo "=== B. where is owner-asserted kind referenced in code ==="
grep -rn "owner-asserted" "$WT/src" --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo "=== C. git log for types.ts provenance change ==="
git -C "$WT" log --oneline -5 -- src/lib/ping/types.ts
git -C "$WT" log --oneline -8 -- src/fyd/sitespec/binding-verifier.ts
