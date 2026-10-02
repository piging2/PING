#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo '=== CREATE BRANCH fyd-factory ==='
git checkout -b fyd-factory 2>&1 | tail -2
git branch --show-current
echo '=== DEV SERVER :3100 ==='
curl -s -o /dev/null -w "http->%{http_code}\n" --max-time 8 http://localhost:3100/ || echo "no response"
echo '=== SITE ROUTES ==='
curl -s -o /dev/null -w "coppersmith->%{http_code}\n" --max-time 8 http://localhost:3100/sites/coppersmith-plumbing || true
curl -s -o /dev/null -w "happy-place->%{http_code}\n" --max-time 8 http://localhost:3100/sites/happy-place || true
echo '=== TEST RUNNER CHECK ==='
ls src/fyd/jest.config.cjs && echo "jest config present"
grep -o '"test[^,]*' package.json | head -5
