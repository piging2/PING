#!/bin/bash
cd /home/nolan/projects/ping
echo "########## src/app/sites/happy-place/page.tsx ##########"
cat src/app/sites/happy-place/page.tsx
echo ""
echo "=== happy-place-platform: framework + deploy target ==="
ls /home/nolan/projects/happy-place-platform/ | grep -v "\.md$" | head -30
cat /home/nolan/projects/happy-place-platform/vercel.json 2>/dev/null
ls /home/nolan/projects/happy-place-platform/.vercel 2>/dev/null
grep -m2 '"name"\|"version"' /home/nolan/projects/happy-place-platform/package.json 2>/dev/null
echo "=== what is it? check README/DEPLOYMENT head ==="
head -30 /home/nolan/projects/happy-place-platform/DEPLOYMENT.md 2>/dev/null
