#!/bin/bash
# SWARM-10 scan 2: wider net — decision inbox, mission/run concepts, blocked states,
# checkpoint, yolo, consequential categories, approve routes. Read-only.
R=/home/nolan/projects/ping
cd "$R" || exit 1

echo "===== T1: ApprovalAuthority anywhere ====="
grep -rln 'ApprovalAuthority' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20

echo "===== T2: decision inbox ====="
grep -rEni 'decision.?inbox|inbox.*decision' src scripts data research 2>/dev/null | grep -v node_modules | head -20

echo "===== T3: mission files ====="
find src scripts data -iname '*mission*' 2>/dev/null | grep -v node_modules | head -30

echo "===== T4: BLOCKED / blocked status ====="
grep -rEn 'BLOCKED' src --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -30

echo "===== T5: checkpoint ====="
grep -rEni 'checkpoint' src/lib src/services --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -30

echo "===== T6: approve routes / approvals table ====="
find src/app/api -ipath '*approv*' 2>/dev/null | head -20
echo "--- approvals table ---"
grep -rEni 'approvals' src/lib --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -20

echo "===== T7: yolo ====="
grep -rEni 'yolo' src scripts --include='*.ts' --include='*.tsx' --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -20

echo "===== T8: consequential categories ====="
grep -rEni 'consequential' src scripts data research 2>/dev/null | grep -v node_modules | head -20

echo "===== T9: capability decision / policy decision points ====="
grep -rEnl 'CapabilityDecision|capability-decision|policyDecision' src 2>/dev/null | grep -v node_modules | head -20

echo "===== T10: cannot proceed / need input / waiting on ====="
grep -rEni 'cannot proceed|unable to proceed|waiting on|awaiting (human|user|operator|owner)|needs (human|user|operator|owner)' src --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -30
