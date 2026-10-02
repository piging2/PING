#!/bin/bash
set -e
cd /home/nolan/fyd-projection-harness
sed 's|/home/nolan/projects/ping/src/fyd/ask/concierge|/home/nolan/fyd-projection-harness/fyd/ask/concierge|' harness.ts > harness-fixed.ts
grep -n "from \"/home/nolan/fyd-projection-harness/fyd/ask/concierge\"" harness-fixed.ts | head -2
rm -rf /home/nolan/fyd-projection-out/shard-0-fixed && mkdir -p /home/nolan/fyd-projection-out/shard-0-fixed
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness-fixed.ts --start=0 --end=500 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-0-fixed 2>&1 | tail -2
echo "=== fixed-run signature counts ==="
python3 - <<'EOF'
import json
from collections import Counter
res=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0-fixed/results.jsonl') if l.strip()]
print(Counter(r['outcome'] for r in res))
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0-fixed/findings.jsonl') if l.strip()]
print(Counter((f['CLASSIFICATION'], f['signature'].split(':')[1]) for f in fs).most_common(8))
EOF
