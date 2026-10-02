#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== shard-2 baseline (unpatched repo concierge) ==="
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=1000 --end=1500 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-2 2>&1 | tail -3
echo "=== shard-2 fixed-concierge rerun ==="
rm -rf /home/nolan/fyd-projection-out/shard-2-fixed && mkdir -p /home/nolan/fyd-projection-out/shard-2-fixed
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness-fixed.ts --start=1000 --end=1500 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-2-fixed 2>&1 | tail -3
echo "=== comparisons ==="
python3 - <<'EOF'
import json
from collections import Counter
for name in ['shard-2','shard-2-fixed']:
    res=[json.loads(l) for l in open(f'/home/nolan/fyd-projection-out/{name}/results.jsonl') if l.strip()]
    print(name, len(res), dict(Counter(r['outcome'] for r in res)))
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-2/findings.jsonl') if l.strip()]
print("baseline finding classes:", Counter((f['CLASSIFICATION'], f['signature'].split(':')[1]) for f in fs).most_common(6))
fs2=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-2-fixed/findings.jsonl') if l.strip()]
print("fixed finding classes:", Counter((f['CLASSIFICATION'], f['signature'].split(':')[1]) for f in fs2).most_common(6))
EOF
