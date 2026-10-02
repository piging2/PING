#!/bin/bash
# SWARM-10 scan 4: escalation/approval/human-decision sweep over /home/nolan/ping runtime code.
# Read-only. Excludes docs and node_modules.
R=/home/nolan/ping
cd "$R" || exit 1
CODE="gateway ping-runtime runtime tools"
echo "===== E1: escalat (code only) ====="
grep -rEni 'escalat' $CODE --include='*.js' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -viE '\.md:' | head -60
echo "===== E2: approval (code only) ====="
grep -rEni 'approval' $CODE --include='*.js' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -80
echo "===== E3: human loop / manual review / decision inbox ====="
grep -rEni 'human.?in.?the.?loop|humanInTheLoop|manual.?review|decision.?inbox|operator.?approval|needs.?human|ask.?nolan' $CODE --include='*.js' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -60
echo "===== E4: MergeGate / ConsensusEngine / veto / grant-deny ====="
grep -rEn 'MergeGate|ConsensusEngine|veto|requireConsensus' $CODE --include='*.js' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -40
echo "===== E5: interrupt / checkpoint / awaiting / pending ====="
grep -rEni 'interrupt|checkpoint|awaiting[A-Z]|pending[A-Z].*(approval|review|human|operator)' $CODE --include='*.js' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -40
