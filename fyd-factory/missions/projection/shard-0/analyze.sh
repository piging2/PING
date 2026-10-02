#!/bin/bash
python3 - <<'EOF'
import json
from collections import Counter
res=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/results.jsonl') if l.strip()]
print("total:",len(res))
print(Counter(r['outcome'] for r in res))
errs=[r for r in res if r['outcome']=='GENERATOR_ERROR']
print("error samples:")
for r in errs[:5]: print(" ", r['mission'], r.get('fixture'), r.get('error'))
print("error fixtures:", Counter(r.get('fixture') for r in errs).most_common(8))
print("variants:", Counter(r.get('variant') for r in errs))
EOF
echo "=== findings signatures ==="
python3 - <<'EOF'
import json
from collections import Counter
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/findings.jsonl') if l.strip()]
print("total findings:",len(fs))
print(Counter((f['CLASSIFICATION'],f['signature'].split(':')[0]+':'+f['signature'].split(':')[1] if ':' in f['signature'] else f['signature']) for f in fs).most_common(20))
EOF
