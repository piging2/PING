#!/bin/bash
cd /home/nolan/projects/ping
echo "=== ObjectProvenance type ==="
sed -n '90,135p' src/lib/ping/types.ts
echo ""
echo "=== coppersmith projection: meta + object summary ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
print('META:', json.dumps(d['meta'], indent=1)[:1500])
print()
print('OBJECT COUNT:', len(d['graph']['objects']))
for o in d['graph']['objects']:
    prov = o.get('provenance', {})
    print('- id:', o['id'], '| schema:', o['schema'], '| vis:', o['visibility'], '| provenance.ref:', prov.get('ref'), '| kind:', prov.get('kind'))
"
