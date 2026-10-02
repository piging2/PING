#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 -c "import json; d=json.load(open('tsconfig.json')); print(json.dumps(d.get('compilerOptions',{}).get('paths',{}), indent=1)); print('baseUrl:', d.get('compilerOptions',{}).get('baseUrl'))"
