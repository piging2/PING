#!/bin/bash
python3 - <<'EOF'
import json
from collections import Counter
res=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/results.jsonl') if l.strip()]
print("results:", len(res), Counter(r['outcome'] for r in res))
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/findings.jsonl') if l.strip()]
print("findings:", len(fs))
sig=Counter((f['CLASSIFICATION'], f['signature']) for f in fs)
for k,v in sig.most_common(12): print(" ", v, k)
# any leak NOT in the two known classes?
known={'leak:concierge:full-graph','leak:ask-answers:hidden-address'}
for f in fs:
    if f['CLASSIFICATION']=='LEAK' and not any(f['signature'].startswith(k.split(':')[0]+':'+k.split(':')[1]) for k in known):
        print("UNKNOWN LEAK:", f['signature'], f['mission'])
print("done")
EOF
