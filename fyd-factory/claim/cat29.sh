#!/bin/bash
cd /home/nolan/projects/ping
echo "--- applyFieldVisibility callers ---"
grep -rn "applyFieldVisibility" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "sitespec/field-visibility" | head
echo "--- site page visibility handling ---"
grep -n "visibility\|applyField" src/app/sites/coppersmith-plumbing/page.tsx src/app/sites/happy-place/page.tsx | head
echo "--- renderer line 78-125 ---"
sed -n '78,125p' src/fyd/components/renderer.tsx
