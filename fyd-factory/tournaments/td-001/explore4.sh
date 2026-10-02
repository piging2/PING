#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== Spec failed validation ====="
grep -rn "Spec failed validation" src --include="*.ts" --include="*.tsx" | head
echo "===== validator file ====="
ls src/fyd/sitespec/
grep -rn "pages.explore\|sections\[0\]\.query" src --include="*.ts" --include="*.tsx" | head -20
echo "===== Explore in generator ====="
grep -n -i "explore" src/fyd/proceduralize/generator.ts | head -30
echo "===== 'all' query ====="
grep -rn '"all"' src/fyd --include="*.ts" --include="*.tsx" | grep -vi test | head -20
