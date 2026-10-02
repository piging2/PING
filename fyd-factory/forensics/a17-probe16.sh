#!/bin/bash
# AGENT-17 probe 16: deployment, circle API, remaining wiring (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== dirty files count ==="
git status --porcelain 2>/dev/null | wc -l
echo "=== next process on Pig (serving :3100?) ==="
ps aux | grep -i 'next' | grep -v grep | head -5
echo "=== fydGatewayBaseUrl env ==="
sed -n '1,30p' src/fyd/social/config.ts
echo "=== /api/fyd/circle head ==="
head -60 src/app/api/fyd/circle/route.ts
echo "=== home-circles data source ==="
grep -n 'fetch(\|api/' src/fyd/ui/home-circles.tsx | head -8
echo "=== /api/fyd/media head ==="
head -40 src/app/api/fyd/media/route.ts
echo "=== SEC-FIX grep in repo ==="
grep -rln 'SEC-FIX' src docs 2>/dev/null | head -5
echo "=== newsletter page caller + contact page ==="
grep -n 'api/newsletter/subscribe' src/app/newsletter/page.tsx | head -3
grep -n 'fetch(\|mailto\|api/' src/app/contact/page.tsx | head -8
