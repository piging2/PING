#!/bin/bash
cd /home/nolan/projects/ping
echo "=== gate.ts ==="
cat src/fyd/owner-mode/gate.ts
echo ""
echo "=== DemoOwnerConsole props ==="
grep -n "interface DemoOwnerConsoleProps\|export function DemoOwnerConsole" -A 15 src/fyd/owner-mode/demo-owner-console.tsx | head -30
echo ""
echo "=== clearwater json shape: keys and graph keys ==="
python3 -c "
import json
d = json.load(open('src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json'))
print('top keys:', list(d.keys()))
print('graph keys:', list(d['graph'].keys()))
objs = d['graph']['objects']
print('n objects:', len(objs))
print('schemas:', sorted(set(o['schema'] for o in objs)))
print('visibilities:', sorted(set(o.get('visibility') for o in objs)))
print('rels:', d['graph'].get('relationships', []) and len(d['graph']['relationships']) or 'none')
"
echo ""
echo "=== concierge exported functions ==="
grep -n "^export function\|^export const\|^export interface\|^export type" src/fyd/ask/concierge.ts
