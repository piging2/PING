#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "hostile fixtures:"; ls "$H/fixtures/hostile" | wc -l
echo "--- pilot manifest status counts ---"
python3 -c "
import json
from collections import Counter
c=Counter()
for l in open('$H/queue/manifest.jsonl'):
    j=json.loads(l); c[j['status']]+=1
print(dict(c))
"
echo "--- lock? ---"; ls "$H/queue/" | head
echo "--- results so far ---"; ls "$H/results" | wc -l
