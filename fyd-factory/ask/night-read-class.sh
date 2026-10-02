#!/bin/bash
cd /home/nolan/projects/ping
echo "=== AskClaimClassification def ==="
grep -rn "interface AskClaimClassification\|type AskClaimClassification" src/ --include="*.ts" | head -5
grep -rn "AskClaimClassification = " -A 8 src/lib/ping/types.ts 2>/dev/null | head -15
echo ""
echo "=== claimClassFor values ==="
sed -n '229,300p' src/fyd/ask/concierge.ts
