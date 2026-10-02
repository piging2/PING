#!/bin/bash
cd /home/nolan/projects/ping
python3 -c "
import json
d = json.load(open('src/fyd/media/manifests/coppersmith-plumbing.json'))
print(type(d), list(d.keys()) if isinstance(d, dict) else len(d))
import sys
s = json.dumps(d)[:300]
print(s)
"
# find first media object in projection
python3 -c "
import json
d = json.load(open('src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json'))
objs = d['graph']['objects'] if 'graph' in d else d.get('objects', [])
for o in objs:
    if o.get('schema') == 'ping.social.media@1':
        print(json.dumps(o, indent=2)[:1500])
        break
"
