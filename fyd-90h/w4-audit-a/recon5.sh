#!/bin/bash
# W4 Audit A - recon5: binding verifier refusal logic + ping-fyd projection evidence
set -u
WT=/tmp/w4-audit-ping
echo "=== A. binding-verifier.ts ==="
wc -l "$WT/src/fyd/sitespec/binding-verifier.ts"
sed -n '1,140p' "$WT/src/fyd/sitespec/binding-verifier.ts"
