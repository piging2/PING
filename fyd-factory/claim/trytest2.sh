#!/bin/bash
cd /home/nolan/projects/ping
python3 -c "import json; d=json.load(open('package.json')); dd=d.get('devDependencies',{}); print([k for k in dd if 'vitest' in k or 'jest' in k or 'tsx' in k or 'swc' in k])"
ls node_modules/.bin/ | grep -i "vitest\|tsx\|swc" | head
echo "---full error head---"
npx jest src/fyd/sitespec/__tests__/binding-verifier.test.ts 2>&1 | head -20
