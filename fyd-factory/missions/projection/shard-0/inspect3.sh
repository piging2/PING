#!/bin/bash
python3 - <<'EOF'
import json
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/findings.jsonl') if l.strip()]
for f in fs:
    if f['CLASSIFICATION']=='MISLABEL':
        print(f['mission'], f['signature'])
        print('  CLAIM:', f['CLAIM'])
        print('  EVIDENCE:', f['EVIDENCE'][:150])
        break
print('---counts by signature---')
from collections import Counter
print(Counter(f['signature'] for f in fs if f['CLASSIFICATION']=='MISLABEL').most_common(10))
print('---leak:ask-answers:hidden-address sample---')
for f in fs:
    if f['signature']=='leak:ask-answers:hidden-address':
        print(f['mission'], f['EVIDENCE'][:160]); break
EOF
