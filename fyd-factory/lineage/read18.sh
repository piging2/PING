#!/bin/bash
cd /home/nolan/fyd-proof-run || exit 1
echo "===== coppersmith observations matching plumbing service ====="
python3 - <<'PY'
import json
d = json.load(open('step1-observations-coppersmith-plumbing.json'))
for i, o in enumerate(d['observations']):
    v = o.get('value') or ''
    if 'new construction for residential' in str(v):
        print(i, json.dumps(o, indent=1)[:1200])
PY
echo "===== happy-place observations matching fencing ====="
python3 - <<'PY'
import json
d = json.load(open('step1-observations-happy-place-platform.json'))
for i, o in enumerate(d['observations']):
    v = o.get('value') or ''
    if 'stay straight' in str(v):
        print(i, json.dumps(o, indent=1)[:1200])
print("total obs:", d['observationCount'])
PY
