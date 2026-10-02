#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== 1. manifest: 20 done? ==="
python3 -c "
import json
from collections import Counter
c = Counter(); ids = set()
for line in open('$H/queue-pilot20/manifest.jsonl'):
    r = json.loads(line); c[r['status']] += 1; ids.add(r['job_id'])
print(dict(c), 'unique_ids=%d' % len(ids))
"
echo "=== 2. 20 result files, all v1.1.0, seq==done_seq ==="
python3 -c "
import json, glob
man = {json.loads(l)['job_id']: json.loads(l) for l in open('$H/queue-pilot20/manifest.jsonl')}
files = glob.glob('$H/results-pilot20/*.json')
print('files=%d' % len(files))
bad = 0
for f in sorted(files):
    r = json.load(open(f))
    m = man.get(r['job_id'])
    if r.get('harness_version') != '1.1.0': bad += 1; print('BAD version', f)
    if r.get('dispatch_seq') != (m or {}).get('done_seq'): bad += 1; print('BAD seq', f, r.get('dispatch_seq'), (m or {}).get('done_seq'))
    if r.get('pipeline_code_version') != m.get('pipeline_code_version', r.get('pipeline_code_version')): pass
print('seq_mismatches=%d' % bad)
print('outcomes:', __import__('collections').Counter(json.load(open(f))['outcome'] for f in files))
"
echo "=== 3. post-resume checksums vs pre-resume snapshot (expect IDENTICAL) ==="
cd "$H/results-pilot20" && sha256sum -c "$H/pilot20-prekill.sha256" 2>&1 | sort | uniq -c | head -3
echo "=== 4. post-resume mtimes vs pre-resume snapshot (expect IDENTICAL) ==="
cd "$H/results-pilot20" && stat -c '%n %Y' *.json | sort > /tmp/post.mtime && diff "$H/pilot20-prekill.mtime" /tmp/post.mtime && echo "MTIMES IDENTICAL"
echo "=== 5. results.jsonl: 20 lines, dedupe by job_id ==="
python3 -c "
import json
from collections import Counter
lines = [json.loads(l) for l in open('$H/results-pilot20.jsonl')]
print('lines=%d unique_job_ids=%d' % (len(lines), len(set(l['job_id'] for l in lines))))
c = Counter((l.get('harness_version'), (l.get('pipeline_code_version') or '?')[:12]) for l in lines)
print(dict(c))
"
