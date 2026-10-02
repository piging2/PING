#!/bin/bash
# W4 Audit A - recon14: emission gate + verifyObjectGraph
set -u
WT=/tmp/w4-audit-ping
echo "=== A. verifier lines 855-903 (emission gate) ==="
sed -n '855,903p' "$WT/src/fyd/sitespec/binding-verifier.ts"
echo "=== B. object-builder.ts lines 120-220 ==="
sed -n '120,220p' "$WT/src/fyd/builder/object-builder.ts"
