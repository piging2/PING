#!/bin/bash
cd /home/nolan/projects/ping
python3 - <<'EOF'
import json
p='/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'
d=json.load(open(p))
print("top keys:", list(d.keys()))
print("meta keys:", list(d['meta'].keys()))
g=d['graph']
print("graph keys:", list(g.keys()))
from collections import Counter
print("schemas:", Counter(o['schema'] for o in g['objects']))
print("n_objects:", len(g['objects']), "n_rels:", len(g['relationships']))
svc=[o for o in g['objects'] if 'service' in o['schema'].lower()]
print("service-ish objects:", len(svc))
for o in svc[:5]: print(" -", o['id'], "|", o['schema'], "|", o.get('title'))
print("sample object keys:", list(g['objects'][0].keys()))
import pprint
pprint.pprint(g['objects'][0], width=160, depth=3)
EOF
