#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== visitor-answer head ====="
head -60 src/fyd/ask/visitor-answer.ts
echo "===== package.json scripts ====="
python3 -c "import json; d=json.load(open('package.json')); print(json.dumps(d.get('scripts',{}), indent=1)); print('devDeps sample:', list(d.get('devDependencies',{}).keys())[:20])"
echo "===== tsx/ts-node available? ====="
ls node_modules/.bin/ 2>/dev/null | grep -E "^(tsx|ts-node|jest)" | head
echo "===== fyd-proof-run on Pig? ====="
ls -la /home/nolan/fyd-proof-run/ 2>&1 | head -15
echo "===== relationships sample: coppersmith ====="
python3 - <<'PY'
import re
t = open('src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts').read()
m = re.search(r'"relationships": \[(.*?)\]\n\};?', t, re.S)
print(m.group(1)[:3000] if m else "NO relationships block found")
PY
