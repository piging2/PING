#!/bin/bash
cd /home/nolan/projects/ping
echo "=== coppersmith object fields ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
for o in d['graph']['objects']:
    print('#####', o['id'], o['schema'])
    print('  title:', o['title'])
    print('  description:', o['description'][:300])
    print('  fields:', json.dumps(o['fields'], indent=1)[:1200])
    print()
"
echo "=== happy-place object fields ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/happy-place.json'))
for o in d['graph']['objects']:
    print('#####', o['id'], o['schema'])
    print('  title:', o['title'])
    print('  description:', o['description'][:300])
    print('  fields:', json.dumps(o['fields'], indent=1)[:1200])
    print()
"
