#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== manifest sample ==="
head -3 "$H/queue-pilot20/manifest.jsonl" | python3 -c "
import json, sys
for line in sys.stdin:
    r = json.loads(line)
    print({k: r.get(k) for k in ('job_id','status','attempts','publish_seq','done_seq','updated_at')})
"
echo "=== attempts distribution ==="
python3 -c "
import json
from collections import Counter
c = Counter()
for line in open('$H/queue-pilot20/manifest.jsonl'):
    c[json.loads(line)['attempts']] += 1
print(dict(c))
"
echo "=== result file mtimes (newest 5) ==="
ls -lt --time-style=full-iso "$H/results-pilot20/" | head -6
date -u
