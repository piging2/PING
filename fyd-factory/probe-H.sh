#!/bin/bash
# LANE-ARCH probe H: jest configs + package.json test scripts (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== src/fyd/jest.config.cjs ==="
cat src/fyd/jest.config.cjs
echo; echo "=== package.json scripts ==="
python3 -c "
import json
d=json.load(open('package.json'))
print(json.dumps(d.get('scripts',{}), indent=1))
print('jest deps:', {k:v for k,v in d.get('devDependencies',{}).items() if 'jest' in k.lower()})
"
echo "=== lane configs list ==="
find src/fyd -name 'jest.config.cjs' | sort
echo "=== node/npm versions ==="
node --version; npm --version
