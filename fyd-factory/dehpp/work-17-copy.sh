#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== golden spec top-level keys ==="
python3 -c "
import json
s = json.load(open('/home/hatch/workspace/fyd-factory/golden/evidence/hpp-composed-spec.json'))
print(sorted(s.keys()))
print('archetype:', repr(s.get('archetype')), 'status:', repr(s.get('status')), 'revision:', repr(s.get('revision')))
print('objectPresence' in s, 'heroMedia' in s)
print('themeTokens keys:', sorted(s['themeTokens'].keys()))
"
echo ""
echo "=== renderer hardcoded copy strings ==="
grep -n "Where we work\|The people\|\"Latest\"\|Start the conversation\|Find us" src/fyd/components/renderer.tsx | head -20
echo ""
echo "=== claim labels ==="
grep -n "Website statement\|Site record\|Demo addition\|Feed item\|Mixed sources\|claimBadgeLabel\|claimKind" src/fyd/components/renderer.tsx | head -20
