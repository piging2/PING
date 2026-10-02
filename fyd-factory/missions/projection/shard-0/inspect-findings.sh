#!/bin/bash
cat /home/nolan/fyd-projection-out/shard-0/findings.jsonl | python3 -c "
import json,sys
from collections import Counter
sigs=Counter()
for l in sys.stdin:
    f=json.loads(l)
    sigs[(f['signature'],f['COMPONENT'])]+=1
    print(f['mission'], f['CLASSIFICATION'], f['signature'], '|', f['CLAIM'][:110])
print(sigs)
"
