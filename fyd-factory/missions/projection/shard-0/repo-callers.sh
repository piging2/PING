#!/bin/bash
cd /home/nolan/projects/ping
echo "=== callers of answerConciergeQuestion / conciergeInputFor ==="
grep -rn "answerConciergeQuestion\|conciergeInputFor" src --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "src/fyd/ask/concierge.ts" | head -10
echo "=== how do callers build objects (visibility)? ==="
grep -rn "conciergeInputFor" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -5
