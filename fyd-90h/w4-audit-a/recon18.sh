#!/bin/bash
# W4 Audit A - recon18: HEAD sitepatch approval-seam vs branch approval gate invariants
set -u
WT=/tmp/w4-audit-ping
BR=phase1/approval-door-2026-09-28
echo "=== A. HEAD sitepatch/approval-seam.ts (key logic) ==="
wc -l "$WT/src/fyd/sitepatch/approval-seam.ts"
grep -n "export function\|export async function\|terminal\|Terminal\|expir\|digest\|capability\|identity" "$WT/src/fyd/sitepatch/approval-seam.ts" | head -30
echo "=== B. branch approval/gate.ts (key logic) ==="
git -C "$WT" show "$BR:src/fyd/approval/gate.ts" | grep -n "export function\|export async function\|terminal\|Terminal\|expir\|digest\|capability\|identity" | head -40
echo "=== C. branch proposal.ts invariants ==="
git -C "$WT" show "$BR:src/fyd/approval/proposal.ts" | grep -n "digest\|expir\|base\|TOCTOU\|stale" | head -20
echo "=== D. 3235804d (served :3214) vs branch/HEAD ==="
git -C "$WT" merge-base --is-ancestor "$BR" 3235804d 2>/dev/null && echo "branch ancestor of 3235804d" || echo "branch NOT ancestor of 3235804d"
git -C "$WT" log --oneline -1 3235804d 2>/dev/null
ls "$WT/src/fyd/approval" 2>/dev/null || echo "NO src/fyd/approval on HEAD"
