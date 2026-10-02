#!/bin/bash
set -e
cd /home/nolan/fyd-wave2
echo "=== SHARD 5: missions 2500-2999 ==="
FYD_OUT=/home/nolan/fyd-wave2/out5 node bundle-object.cjs 2500 3000 2>/dev/null | tail -3
echo "=== SHARD 6: missions 3000-3499 ==="
FYD_OUT=/home/nolan/fyd-wave2/out6 node bundle-object.cjs 3000 3500 2>/dev/null | tail -3
echo "=== line counts ==="
wc -l /home/nolan/fyd-wave2/out5/results.jsonl /home/nolan/fyd-wave2/out6/results.jsonl
echo "=== outcome distribution ==="
python3 - <<'PYEOF'
import json, collections
for name in ['out5','out6']:
    c = collections.Counter()
    for line in open(f'/home/nolan/fyd-wave2/{name}/results.jsonl'):
        c[json.loads(line)['outcome']] += 1
    print(name, dict(c))
PYEOF
