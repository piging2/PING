#!/bin/bash
python3 -c "
import json
d = json.load(open('/home/nolan/fyd-proof-run/step1-observations-coppersmith-plumbing.json'))
obs = d['observations']
# find phone observation
for o in obs:
    if o.get('property') == 'phone' and o.get('entityId','').endswith('2f1327c09d622175'):
        print(json.dumps(o, indent=1))
        break
print('---- one service observation ----')
for o in obs:
    if 'service' in o.get('entityId','') and o.get('property') == 'name':
        print(json.dumps(o, indent=1))
        break
"
echo ""
echo "=== search for pinned raw bytes ==="
find /home/nolan/fyd-proof-run /home/nolan/ping/var -name "*.html" -o -name "*.xml" 2>/dev/null | head
echo "--- grep regen.ts for pinned file paths ---"
grep -n "pinned\|rawBytes\|raw bytes\|sourceFile\|SOURCE_DIR\|readFileSync\|copyFileSync" /home/nolan/fyd-proof-run/regen.ts | head -30
