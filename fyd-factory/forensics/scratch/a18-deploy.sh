#!/bin/bash
cd /home/nolan/projects/ping
echo "===== package.json scripts ====="; python3 -c "import json; print(json.dumps(json.load(open('package.json'))['scripts'], indent=1))" 2>/dev/null || grep -A 30 '"scripts"' package.json | head -35
echo; echo "===== deploy configs ====="; ls vercel.json next.config.* .github/workflows/ 2>/dev/null
echo; echo "===== health endpoints ====="; ls src/app/api/health/ src/app/api/diagnostics/ 2>/dev/null; head -50 src/app/api/health/route.ts 2>/dev/null || ls src/app/api/health
