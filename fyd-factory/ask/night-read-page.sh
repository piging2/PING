#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1,100p' src/app/sites/happy-place/page.tsx
echo ""
echo "=== coppersmith page existence ==="
ls src/app/sites/coppersmith-plumbing/
grep -n "SITE_ID\|siteId" src/app/sites/coppersmith-plumbing/page.tsx 2>/dev/null | head -5
