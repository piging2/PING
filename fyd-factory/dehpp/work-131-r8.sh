#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git show HEAD:src/app/sites/happy-place/page.tsx | grep -n "DemoOwnerMode\|NEXT_PUBLIC" | head -6
echo "=== my demo-chrome context ==="
sed -n '160,180p' src/app/sites/_shared/demo-chrome.tsx