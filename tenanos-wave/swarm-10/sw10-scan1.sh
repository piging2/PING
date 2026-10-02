#!/bin/bash
# SWARM-10 scan 1: broad sweep for escalation / approval / human-decision points.
# Read-only. Run on Pig WSL: bash /mnt/c/Users/nolan/transfer/sw10-scan1.sh
R=/home/nolan/projects/ping
cd "$R" || exit 1

echo "===== S1: escalat* (src, scripts) ====="
grep -rEni 'escalat' src scripts --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -50

echo "===== S2: approval terms ====="
grep -rEn 'requireApproval|needsApproval|requestApproval|awaitingApproval|pendingApproval|approvalRequired|approval_required|ApprovalRequired' src scripts --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -60

echo "===== S3: human-in-the-loop terms ====="
grep -rEni 'humanInTheLoop|human-in-the-loop|human_in_the_loop|needsHuman|askNolan|askUser|promptUser' src scripts --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -60

echo "===== S4: confirmation gates ====="
grep -rEn 'requireConfirmation|needsConfirmation|confirmAction|requestConfirmation|confirmDialog' src scripts --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -40

echo "===== S5: interrupt / blocked-on-human ====="
grep -rEni 'interrupt|manualReview|manual-review|operatorApproval|operator-approval|decisionInbox|decision-inbox|decision_inbox' src scripts --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -60

echo "===== S6: ApprovalAuthority ====="
grep -rln 'ApprovalAuthority' src scripts data --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' 2>/dev/null | grep -v node_modules | head -20

echo "===== S7: mission/run execution loop files ====="
find src -iname '*mission*' -not -path '*node_modules*' 2>/dev/null | head -20
echo "--- run ---"
find src -iname '*durable*' -o -iname '*run-ledger*' -o -iname '*runledger*' -not -path '*node_modules*' 2>/dev/null | head -20

echo "===== S8: repo top dirs (scripts, data) ====="
ls scripts | head -50
echo "--- data ---"
ls data | head -50
