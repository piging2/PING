#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== manifest status counts ==="
python3 -c "
import json
from collections import Counter
c = Counter()
for line in open('$H/queue-pilot20/manifest.jsonl'):
    c[json.loads(line)['status']] += 1
print(dict(c))
"
echo "=== result file versions ==="
python3 -c "
import json, glob
from collections import Counter
c = Counter()
for f in glob.glob('$H/results-pilot20/*.json'):
    r = json.load(open(f))
    c[(r.get('harness_version'), (r.get('pipeline_code_version') or '?')[:12], r.get('dispatch_seq'))] += 1
for k, v in sorted(c.items()): print(k, v)
"
echo "=== results.jsonl lines ==="
wc -l < "$H/results-pilot20.jsonl"
