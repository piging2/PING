#!/bin/bash
# Explore relationships shape for service objects (read-only).
cd /home/nolan/projects/ping
python3 - <<'EOF'
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
g = d['graph']
print("RELS:")
for r in g['relationships']: print(r)
print()
svcs = [o for o in g['objects'] if o['schema']=='ping.social.service@1']
import pprint
pprint.pprint(svcs[0], width=160, depth=4)
EOF
