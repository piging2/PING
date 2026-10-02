#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== entityId usage in proceduralize ====="
grep -rn "entityId" src/fyd/proceduralize/*.ts | grep -v test | head -20
echo "===== detectSitePatchIntent keywords ====="
grep -n "function detectSitePatchIntent" -A 40 src/fyd/ask/site-patch.ts | head -60
echo "===== happy-place 8th object ====="
python3 - <<'PY'
import json
doc = json.load(open('/home/nolan/ping/var/fyd-projections/happy-place.json'))
ids = [o['id'] for o in doc['graph']['objects']]
print(len(ids))
for i in ids: print(i)
PY
