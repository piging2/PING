#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== killtest manifest ==="
python3 -c "
import json
from collections import Counter
c = Counter(); ids = set()
for line in open('$H/queue-killtest/manifest.jsonl'):
    r = json.loads(line); c[r['status']] += 1; ids.add(r['job_id'])
print(dict(c), 'unique=%d' % len(ids))
"
echo "=== killtest files: 40, all v1.1.0, outcomes ==="
python3 -c "
import json, glob
from collections import Counter
files = glob.glob('$H/results-killtest/*.json')
c = Counter(); bad = 0
for f in files:
    r = json.load(open(f)); c[(r['outcome'], r.get('harness_version'), (r.get('pipeline_code_version') or '?')[:12])] += 1
    if r.get('dispatch_seq') is None: bad += 1
print('files=%d' % len(files), dict(c), 'missing_seq=%d' % bad)
"
echo "=== killtest jsonl: dedupe by job_id ==="
python3 -c "
import json
lines = [json.loads(l) for l in open('$H/results-killtest.jsonl')]
print('lines=%d unique=%d' % (len(lines), len(set(l['job_id'] for l in lines))))
"
