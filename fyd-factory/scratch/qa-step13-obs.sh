#!/bin/bash
echo "=== coppersmith observations: top-level keys ==="
python3 -c "
import json
d = json.load(open('/home/nolan/fyd-proof-run/step1-observations-coppersmith-plumbing.json'))
print(type(d))
if isinstance(d, dict): print(list(d.keys()))
if isinstance(d, list): print('len', len(d)); print(json.dumps(d[0], indent=1)[:2500])
"
echo ""
echo "=== happy-place observations: top-level keys ==="
python3 -c "
import json
d = json.load(open('/home/nolan/fyd-proof-run/step1-observations-happy-place-platform.json'))
print(type(d))
if isinstance(d, dict): print(list(d.keys()))
if isinstance(d, list): print('len', len(d)); print(json.dumps(d[0], indent=1)[:2500])
"
