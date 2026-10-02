#!/bin/bash
# W4 Audit A - recon16: approval-door branch vs HEAD
set -u
WT=/tmp/w4-audit-ping
BR=phase1/approval-door-2026-09-28
echo "=== A. branch exists? ==="
git -C "$WT" rev-parse --verify "$BR" 2>&1 | head -2
echo "=== B. diff stat branch vs HEAD (customize/owner-mode/proposal paths) ==="
git -C "$WT" diff --stat "f877c3919941978f07d5014909595df4751ec258" "$BR" -- src/fyd/customize src/fyd/owner-mode src/app/api/fyd/customize src/app/api/ping/proposal 2>/dev/null | tail -30
echo "=== C. files on branch not on HEAD (same paths) ==="
git -C "$WT" diff --name-status "f877c3919941978f07d5014909595df4751ec258" "$BR" -- src/fyd/customize src/fyd/owner-mode src/app/api/fyd/customize src/app/api/ping/proposal 2>/dev/null | head -30
echo "=== D. HEAD customize route: approval enforcement ==="
grep -n "approv\|proposal\|digest\|expire" "$WT/src/app/api/fyd/customize/route.ts" | head -25
echo "=== E. HEAD owner-mode gate.ts ==="
grep -n "export function\|export async function\|APPROV" "$WT/src/fyd/owner-mode/gate.ts" | head -20
