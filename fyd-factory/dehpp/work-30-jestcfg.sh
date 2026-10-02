#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 -c "
import json
p = json.load(open('package.json'))
print(json.dumps(p.get('jest'), indent=1)[:2000])
"
echo ""
echo "=== builder jest config ==="
cat src/fyd/builder/jest.config.cjs
