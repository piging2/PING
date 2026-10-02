#!/bin/bash
# W4 Audit A - recon13: where BindingVerificationError is thrown in the compose path
set -u
WT=/tmp/w4-audit-ping
echo "=== A. BindingVerificationError throw sites ==="
grep -rn "BindingVerificationError" "$WT/src" --include="*.ts" | grep -v __tests__ | head -10
echo "=== B. verifyObjectGraph definition ==="
grep -rn "export function verifyObjectGraph\|export async function verifyObjectGraph" "$WT/src" --include="*.ts" | head -3
echo "=== C. verifyBindings callers ==="
grep -rn "verifyBindings\|verifyPresentationBinding" "$WT/src/fyd/builder" "$WT/src/fyd/sitespec" --include="*.ts" | grep -v __tests__ | grep -v "^.*binding-verifier.ts.*export" | head -15
