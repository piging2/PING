#!/bin/bash
# F5-CEILING probe M: is the strategy-level policy (sectionPriority etc.) consumed anywhere?
set -e
cd /home/nolan/projects/ping
echo "=== consumers of strategy policy fields ==="
grep -rn "sectionPriority\|objectEmphasis\|navigationStrategy" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "builder/strategies.ts" | head -20
echo ""
echo "=== tests referencing strategy policy ==="
grep -rln "sectionPriority\|objectEmphasis" src/ --include="*.test.ts" | head
