#!/bin/bash
echo "=== fyd-proof-run dir ==="
ls -la /home/nolan/fyd-proof-run/ 2>&1 | head -30
echo ""
echo "=== happy-place pergola service provenance ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/happy-place.json'))
for o in d['graph']['objects']:
    if 'Pergola' in o['title']:
        print(json.dumps(o, indent=1)[:2000])
"
echo ""
echo "=== happy-place meta ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/happy-place.json'))
print(json.dumps(d['meta'], indent=1)[:1200])
print('presentationIntent keys:', list(d.get('presentationIntent', {}).keys()) if d.get('presentationIntent') else None)
"
