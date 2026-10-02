#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== @/types/media.ts type names ====="
grep -n "^export \(interface\|type\)" src/types/media.ts 2>/dev/null | head -30
echo "===== PresentationSpec search ====="
grep -rln "PresentationSpec" src/fyd --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
echo "===== contrast token search ====="
grep -rln "contrast" src/fyd --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
