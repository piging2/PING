#!/bin/bash
# LANE-ARCH probe E: graph data source, fixture formats, strategy files (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== src/fyd/data/ping-object-source.ts ==="
cat src/fyd/data/ping-object-source.ts | head -100
echo; echo "=== src/fyd/data/fyd-tenant-graph.ts (head) ==="
head -60 src/fyd/data/fyd-tenant-graph.ts
echo; echo "=== STRATEGY PINS (strategy-for-site.ts) ==="
cat src/fyd/builder/strategy-for-site.ts
echo; echo "=== infer-strategy.ts (head 80) ==="
head -80 src/fyd/builder/infer-strategy.ts
echo; echo "=== generator.ts exports + head ==="
grep -E '^export' src/fyd/proceduralize/generator.ts | head -20
echo; echo "=== FIXTURE formats: object projection fixture head ==="
python3 -c "
import json
p='src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json'
d=json.load(open(p))
print('keys:', list(d.keys())[:20])
print('type:', type(d).__name__)
s=json.dumps(d)
print('bytes:', len(s))
"
echo "=== media manifest coppersmith head ==="
head -c 800 src/fyd/media/manifests/coppersmith-plumbing.json; echo
echo "=== preview manifest coppersmith head ==="
head -c 600 src/fyd/preview/manifests/coppersmith-plumbing.json; echo
echo "=== data/fyd-identity, fyd-owner dirs (pig side stores) ==="
ls data/fyd-owner data/fyd-identity 2>/dev/null | head -20
echo "=== where do projections live? search for 'projections' dirs ==="
find src/fyd -type d | grep -v __tests__ | sort
