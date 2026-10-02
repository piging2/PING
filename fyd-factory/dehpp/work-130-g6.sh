#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== DEFAULT_HOME_SECTION_ORDER ==="
grep -n "DEFAULT_HOME_SECTION_ORDER" -A 16 src/fyd/compose/profile.ts | head -20
echo "=== DemoOwnerMode gate in demo-chrome ==="
grep -n "DemoOwnerMode\|NEXT_PUBLIC" src/app/sites/_shared/demo-chrome.tsx | head -8
echo "=== generator historical emission order ==="
grep -n 'add("\|sections.push\|emit(' src/fyd/proceduralize/generator.ts | head -20