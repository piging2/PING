#!/bin/bash
echo "=== dev server :3100 on Pig WSL ==="
curl -s -o /dev/null -w "HTTP %{http_code} (%{time_total}s)\n" --max-time 15 http://localhost:3100/sites/happy-place || echo "CURL FAILED :3100"
echo "=== CDP :9223 on Pig (via ssh to windows host) ==="
# CDP runs on the Windows host side; from WSL reach it via the host IP
for host in 127.0.0.1 100.79.154.43; do
  echo "-- host $host --"
  curl -s --max-time 8 "http://$host:9223/json/version" | head -c 400
  echo ""
done
echo "=== node availability on Pig WSL ==="
which node; node --version 2>/dev/null
echo "=== playwright-core on Pig ==="
ls /home/nolan/node_modules/playwright-core 2>/dev/null && echo "playwright-core OK" || echo "no node_modules in home"
find /home/nolan -maxdepth 3 -name "playwright-core" -type d 2>/dev/null | head -3
