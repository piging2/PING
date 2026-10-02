#!/bin/bash
# W4 Audit A - recon6: the exact refusal rule + ping-fyd projection provenance
set -u
WT=/tmp/w4-audit-ping
echo "=== A. refusal rule in binding-verifier ==="
grep -n "cannot back direct evidence\|non-website provenance\|ObjectProvenanceKind" "$WT/src/fyd/sitespec/binding-verifier.ts" | head -20
echo "=== B. provenance kinds in types ==="
grep -n "ObjectProvenanceKind" -A 15 "$WT/src/lib/ping/types.ts" | head -40
echo "=== C. ping-fyd projection: business object ==="
ls -la /home/nolan/ping/var/fyd-projections/ | head
python3 -c "
import json
p=json.load(open('/home/nolan/ping/var/fyd-projections/ping-fyd.json'))
print('meta keys:', list(p.get('meta',{}).keys()))
print('n objects:', len(p['graph']['objects']))
for o in p['graph']['objects']:
    print(o['id'], '| schema:', o.get('schema'), '| provenance:', json.dumps(o.get('provenance'))[:160])
" 2>&1 | head -20
