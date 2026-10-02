#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== happy-place services + rels ====="
python3 - <<'PY'
import re
t = open('src/fyd/proceduralize/__fixtures__/happy-place-graph.ts').read()
for m in re.finditer(r'\{\s*"id": "([^"]+)",\s*"schema": "ping\.social\.service@1",[^}]*?"title": "([^"]+)"', t, re.S):
    print(m.group(1), "|", m.group(2))
print("--- relationships ---")
m = re.search(r'"relationships": \[(.*?)\]\n\};?', t, re.S)
if m:
    for r in re.finditer(r'"predicate": "([^"]+)",\s*"object": "([^"]+)",\s*"status": "([^"]+)",[^}]*?"evidenceRef": "([^"]+)"', m.group(1)):
        print(r.group(1), r.group(2).split('-service-')[-1][:12], r.group(3), r.group(4))
PY
echo "===== coppersmith services ====="
python3 - <<'PY'
import re
t = open('src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts').read()
for m in re.finditer(r'"id": "([^"]+-service-[^"]+)",\s*"schema": "ping\.social\.service@1",[^}]*?"title": "([^"]+)"', t, re.S):
    print(m.group(1), "|", m.group(2))
PY
echo "===== components dir ====="
ls src/fyd/components/
echo "===== registry services ====="
grep -n "Services" src/fyd/components/registry.ts | head -10
