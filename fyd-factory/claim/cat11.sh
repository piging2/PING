#!/bin/bash
cd /home/nolan/projects/ping
echo "########## package.json scripts + vitest config ##########"
python3 -c "import json; d=json.load(open('package.json')); print(json.dumps(d.get('scripts',{}),indent=1))"
ls vitest.config.* vite.config.* 2>/dev/null
echo
echo "########## builder fixtures ##########"
sed -n '1,120p' src/fyd/builder/__tests__/fixtures.ts
