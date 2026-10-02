#!/bin/bash
grep -n "RAW_DIR\s*=" /home/nolan/fyd-proof-run/regen.ts | head -5
echo "=== RAW_DIR listing ==="
RAW=$(grep -oP "RAW_DIR\s*=\s*[\"']\K[^\"']+" /home/nolan/fyd-proof-run/regen.ts | head -1)
echo "RAW_DIR=$RAW"
ls -la "$RAW" 2>&1 | head -20
ls -la "$RAW/coppersmith-plumbing" 2>&1 | head -20
echo ""
echo "=== sample observations (full record) ==="
python3 -c "
import json
d = json.load(open('/home/nolan/fyd-proof-run/step1-observations-coppersmith-plumbing.json'))
obs = d['observations']
for o in obs[:3]:
    print(json.dumps(o, indent=1))
    print('---')
"
