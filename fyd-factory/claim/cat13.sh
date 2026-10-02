#!/bin/bash
cd /home/nolan/projects/ping
echo "########## jest config in package.json ##########"
python3 -c "import json; d=json.load(open('package.json')); print(json.dumps(d.get('jest',{}),indent=1))"
echo
echo "########## OwnerFieldCorrection type ##########"
grep -n "OwnerFieldCorrection" -A 25 src/lib/ping/types.ts | head -50
echo
echo "########## provenance type ##########"
grep -n "interface Provenance\|provenance?:" src/lib/ping/types.ts | head -10
