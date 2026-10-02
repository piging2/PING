#!/bin/bash
cd /home/nolan/projects/ping
base64 -d > src/fyd/sitespec/__tests__/zz-hostile-supp.test.ts <<'B64EOF'

B64EOF
mkdir -p /tmp/hostile-pipe
npx jest --config src/fyd/sitespec/jest.config.cjs zz-hostile-supp > /tmp/hostile-pipe/jest.log 2>&1
echo "jest exit: $?"
grep -E "Tests:" /tmp/hostile-pipe/jest.log | tail -2
awk '/HOSTILE_JSON_BEGIN/{f=1;next}/HOSTILE_JSON_END/{f=0}f' /tmp/hostile-pipe/jest.log
rm -rf /tmp/hostile-pipe
rm -f src/fyd/sitespec/__tests__/zz-hostile-supp.test.ts
git status --porcelain | grep "zz-hostile" || echo "temp file gone"
