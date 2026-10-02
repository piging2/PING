#!/bin/bash
# F5-CEILING probe I: tenant context helpers, projection JSONs, dogfood projection file
set -e
cd /home/nolan/projects/ping
echo "=== tenant context exports ==="
grep -n "^export" src/fyd/tenant/tenant-context.ts | head -20
echo "=== projection JSONs head ==="
python3 -c "
import json
for f in ['src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json','src/fyd/object/__tests__/fixtures/projections/happy-place.json']:
    d=json.load(open(f))
    print(f, type(d).__name__, list(d.keys())[:10] if isinstance(d,dict) else len(d))
"
echo "=== dogfood projection on disk ==="
ls -la /home/nolan/ping/var/fyd-projections/ 2>/dev/null || echo "NO /home/nolan/ping/var/fyd-projections"
echo "=== strategies vectors ==="
grep -n "vector" src/fyd/builder/strategies.ts | head -20
grep -n -A12 "KNOWLEDGE_WORKER: SiteStrategy" src/fyd/builder/strategies.ts | head -20
grep -n -A12 "TRADES: SiteStrategy" src/fyd/builder/strategies.ts | head -20
grep -n -A12 "TECHNOLOGY: SiteStrategy" src/fyd/builder/strategies.ts | head -20
