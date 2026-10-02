#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== manifest status ==="
python3 -c "
import json
from collections import Counter
c = Counter()
for line in open('$H/queue-pilot20/manifest.jsonl'):
    c[json.loads(line)['status']] += 1
print(dict(c))
"
echo "=== 5 committed results: outcome/version/seq ==="
python3 -c "
import json, glob
for f in sorted(glob.glob('$H/results-pilot20/*.json')):
    r = json.load(open(f))
    print(r['outcome'], r['harness_version'], (r.get('pipeline_code_version') or '?')[:12], 'seq=%s' % r.get('dispatch_seq'))
"
echo "=== results.jsonl lines ==="
wc -l < "$H/results-pilot20.jsonl"
echo "=== runner log tail ==="
tail -8 "$H/pilot20.log"
