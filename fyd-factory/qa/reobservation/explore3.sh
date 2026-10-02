#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== package.json scripts ==="
python3 -c "
import json
d = json.load(open('package.json'))
for k,v in d.get('scripts',{}).items(): print(k, '::', v)
"
echo "=== pipeline.ts head ==="
head -80 src/fyd/preview/pipeline.ts
echo "=== preview README or docs ==="
ls src/fyd/preview/manifests/; echo "---"; head -50 src/fyd/preview/manifests/coppersmith-plumbing.json
