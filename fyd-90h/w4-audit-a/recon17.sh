#!/bin/bash
# W4 Audit A - recon17: what is unique on the approval-door branch?
set -u
WT=/tmp/w4-audit-ping
BR=phase1/approval-door-2026-09-28
echo "=== A. branch tip + unique commits vs HEAD ==="
git -C "$WT" log --oneline -8 "$BR" | head -8
echo "=== B. merge-base with HEAD ==="
git -C "$WT" merge-base --short HEAD "$BR"
echo "=== C. full diff stat HEAD..branch ==="
git -C "$WT" diff --stat HEAD "$BR" | tail -25
echo "=== D. reverse: diff stat branch..HEAD (what HEAD has that branch lacks) ==="
git -C "$WT" diff --stat "$BR" HEAD | tail -8
