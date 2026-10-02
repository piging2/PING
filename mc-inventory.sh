#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===A gateway routes (server.mjs)==="
grep -oE '(req\.method === .[A-Z]+|url\.pathname[^;]*|pathname === .[^;]*)' tools/fyd-journal-gateway/server.mjs | head -40
echo "===B event types in events.jsonl==="
python3 -c "
import json, collections
c=collections.Counter()
for line in open('data/fyd-journal/events.jsonl'):
    line=line.strip()
    if line:
        try: c[json.loads(line).get('event_type')]+=1
        except: pass
print(dict(c))
"
echo "===C tenant object stores==="
grep -rn "happy-place" src/fyd/tenant/tenant-context.ts 2>/dev/null | head -5
ls src/fyd/data/ 2>/dev/null | head -20
echo "===D SiteSpec location==="
grep -rln "sitespec" src/fyd/sitespec/*.ts 2>/dev/null | head -3
grep -rn "data/" src/fyd/ask/site-spec.ts 2>/dev/null | head -10
echo "===E ping routes param shapes==="
for r in feed node actions circle ask object; do
  echo "--- /api/ping/$r ---"
  grep -n -E 'searchParams|params\.' "src/app/api/ping/$r/route.ts" | head -12
done
echo "===F wave2 store search==="
find . -path ./node_modules -prune -o -type d -iname '*wave*' -print 2>/dev/null | head
find data src -iname '*wave*' 2>/dev/null | head -20
grep -rln -i "wave.2\|wave2\|1000" src/lib src/fyd 2>/dev/null | head -10
echo "===G tenant ids present==="
grep -rn "TENANTS\s*=" src/fyd/tenant/tenant-context.ts 2>/dev/null | head -3
grep -rn "coppersmith" src/fyd/tenant/tenant-context.ts 2>/dev/null | head -5
echo "===H site bundle loader path==="
sed -n '1,40p' src/fyd/media/site-bundle.ts 2>/dev/null | head -40
