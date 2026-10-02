#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===A server.mjs route table==="
grep -n -e 'pathname' tools/fyd-journal-gateway/server.mjs | head -20
echo "===A2 server.mjs method+path pairs==="
grep -n -e 'GET\|POST\|PUT\|DELETE\|PATCH' tools/fyd-journal-gateway/server.mjs | grep -e '"' | grep -e '/' | head -30
echo "===C fixture base graph==="
grep -n -e 'fixture\|FIXTURE\|data/fyd\|\.json' src/fyd/data/fyd-tenant-graph.ts | head -25
echo "===C2 ping-object-source==="
grep -n -e 'fixture\|data/\|\.json' src/fyd/data/ping-object-source.ts 2>/dev/null | head -25
echo "===C3 tenant ids==="
grep -n -e 'getFydTenantIds\|TENANTS\|happy-place\|coppersmith' src/fyd/data/fyd-tenant-graph.ts | head -20
echo "===D site-spec provider==="
sed -n '1,60p' src/fyd/ask/site-spec.ts
echo "===F wave2 store hunt==="
grep -rn -e 'wave-2\|wave2\|WAVE_2' src/lib/ping/ping-object-reader.ts src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md 2>/dev/null | head -10
ls src/fyd/harvest/ 2>/dev/null | head -20
find . -path ./node_modules -prune -o -type f -iname '*wave2*' -print 2>/dev/null | grep -v '.git/' | head -20
echo "===I READ-SURFACE-INVENTORY==="
wc -l src/app/api/fyd/READ-SURFACE-INVENTORY.md
head -80 src/app/api/fyd/READ-SURFACE-INVENTORY.md
