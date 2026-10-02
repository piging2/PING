#!/bin/bash
# W4 Audit A - recon12: verifyObjectGraph + owner assertion plumbing
set -u
WT=/tmp/w4-audit-ping
echo "=== A. object-builder.ts: verifyObjectGraph ==="
grep -n "ownerAssertion\|OwnerAssertion\|assertSpecBindingsVerified\|verifyBindings\|ownerFieldCorrection" "$WT/src/fyd/builder/object-builder.ts" | head -20
echo "=== B. where assertSpecBindingsVerified is called ==="
grep -rn "assertSpecBindingsVerified\|dropUnboundBindings" "$WT/src" --include="*.ts" | grep -v __tests__ | grep -v "binding-verifier" | head -10
echo "=== C. verifier: owner_authored case ==="
grep -n "owner_authored" "$WT/src/fyd/sitespec/binding-verifier.ts" | head
sed -n '/case "owner_authored"/,/case "generated"/p' "$WT/src/fyd/sitespec/binding-verifier.ts" | head -40
