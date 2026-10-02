#!/bin/bash
cat /home/nolan/fyd-projection-out/shard-0/findings.jsonl | python3 -c "
import json,sys
for l in sys.stdin:
    f=json.loads(l)
    print(f['mission'], f['CLASSIFICATION'], f['signature'], '|', f['EVIDENCE'][:100])
"
