#!/bin/bash
# Probe: discover SiteSpec type in src/fyd/sitespec and find fixtures
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
git branch --show-current 2>/dev/null
echo "=== src/fyd/sitespec ==="
ls -la src/fyd/sitespec/ 2>/dev/null || echo "NO src/fyd/sitespec"
echo "=== head of main sitespec type file ==="
for f in src/fyd/sitespec/*.ts src/fyd/sitespec/*.tsx; do
  [ -f "$f" ] && echo "--- $f" && head -80 "$f"
done 2>/dev/null
echo "=== fixture search: coppersmith ==="
find . -path ./node_modules -prune -o -iname "*coppersmith*" -print 2>/dev/null | grep -v node_modules | head -30
echo "=== fixture search: happy-place ==="
find . -path ./node_modules -prune -o -iname "*happy-place*" -print 2>/dev/null | grep -v node_modules | head -30
echo "=== fixture dirs ==="
find . -path ./node_modules -prune -o -type d -iname "*fixture*" -print 2>/dev/null | head -20
echo "=== F2 corpus ==="
find . -path ./node_modules -prune -o -iname "*f2*" -print 2>/dev/null | grep -v node_modules | head -30
