#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== o/[objectId]/page.tsx ==="
cat 'src/app/o/[objectId]/page.tsx'
echo "=== public object ids in happy-place projection ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/happy-place.json'))
g = d['graph'] if 'graph' in d else d
for o in g.get('objects', []):
    if o.get('visibility') == 'public':
        print(o['id'], '|', o.get('schema'), '|', o.get('title','')[:60])
" | head -10
