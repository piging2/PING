#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== when was the feedSchemas filter introduced ====="
git log --oneline -S 'eligibleComponents(s).includes("ObjectFeed")' -- src/fyd/proceduralize/generator.ts
echo "===== FAILURE_LEDGER FL-20260921-031 ====="
grep -rn "FL-20260921-031" ~/workspace/fyd-factory/failures/FAILURE_LEDGER.md 2>/dev/null | head -3
grep -n -A12 "FL-20260921-031" ~/workspace/fyd-factory/failures/FAILURE_LEDGER.md 2>/dev/null | head -25
echo "===== repo FAILURE_LEDGER ====="
find . -name "FAILURE_LEDGER.md" -not -path "./node_modules/*" 2>/dev/null | head
