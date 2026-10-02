#!/bin/bash
cd /home/nolan/projects/ping
echo "=== happy-place page: spec + console mount ==="
grep -n "DemoOwnerConsole\|buildSiteSpec\|spec\b\|Spec\b" src/app/sites/happy-place/page.tsx | head -30
echo ""
echo "=== where FYDSiteSpec comes from ==="
grep -rn "makeSpec\|buildSpec\|FYDSiteSpec" src/app/sites/happy-place/page.tsx | head -10
echo ""
echo "=== sitespec index exports ==="
head -50 src/fyd/sitespec/index.ts
