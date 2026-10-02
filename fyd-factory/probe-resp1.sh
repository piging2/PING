#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== BRANCH ==="
git branch --show-current 2>&1
git status --short 2>&1 | head -20
echo "=== TEST FILE ==="
ls -la src/fyd/components/__tests__/ 2>&1
echo "=== DEV SERVER ==="
curl -s -o /dev/null -w "HTTP %{http_code} %{time_total}s\n" --max-time 15 http://localhost:3100/ || echo "DEV SERVER UNREACHABLE"
echo "=== SITE PAGES ==="
curl -s -o /dev/null -w "coppersmith: %{http_code}\n" --max-time 15 http://localhost:3100/sites/coppersmith-plumbing || echo "coppersmith unreachable"
curl -s -o /dev/null -w "happy-place: %{http_code}\n" --max-time 15 http://localhost:3100/sites/happy-place || echo "happy-place unreachable"
