#!/bin/bash
echo "=== happy-place-platform/website structure ==="
ls /home/nolan/projects/happy-place-platform/website/ 2>/dev/null | head -30
find /home/nolan/projects/happy-place-platform/website -maxdepth 2 -name "package.json" -o -maxdepth 2 -name "*.json" 2>/dev/null | head -5
grep -m2 '"name"' /home/nolan/projects/happy-place-platform/website/package.json 2>/dev/null
echo "=== vercel site HTML (first 60 lines) ==="
curl -s --max-time 25 https://happy-place-platform.vercel.app/ -o /tmp/hpp-vercel.html -w "HTTP %{http_code}, %{size_download} bytes\n" 2>&1 || echo CURL_FAILED
head -c 3000 /tmp/hpp-vercel.html 2>/dev/null
echo ""
echo "=== dev server :3100 status ==="
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3100/sites/happy-place 2>&1 || echo DEV_SERVER_DOWN
echo "=== ping object source for happy-place ==="
grep -rn "happy-place" /home/nolan/projects/ping/src/fyd/data/ping-object-source.ts 2>/dev/null | head -10
ls /home/nolan/projects/ping/src/fyd/data/ 2>/dev/null
