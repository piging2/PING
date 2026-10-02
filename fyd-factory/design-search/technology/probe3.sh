#!/bin/bash
# F3-DESIGN-C probe3: FYDSiteSpec interface, dogfood projection graph, TECHNOLOGY strategy
cd /home/nolan/projects/ping || exit 1
echo "=== FYDSiteSpec interface location ==="
grep -n "interface FYDSiteSpec" src/fyd/sitespec/types.ts
echo "=== FYDSiteSpec block ==="
awk '/export interface FYDSiteSpec \{/,/^}/' src/fyd/sitespec/types.ts | head -60
echo "=== FYDThemeTokens tail ==="
awk '/export interface FYDThemeTokens \{/,/^}/' src/fyd/sitespec/types.ts | head -30
echo "=== SCHEMA_ROLES ==="
grep -n "SCHEMA_ROLES" -A 20 src/fyd/sitespec/schemas.ts | head -40
echo "=== dogfood projection graph ==="
ls -la /home/nolan/ping/var/fyd-projections/ 2>/dev/null | head
echo "=== ping-fyd.json objects ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/ping-fyd.json'))
g = d['graph']
for o in g['objects']:
    print('OBJ', o['id'], '|', o.get('schema'), '|', o.get('title'))
    if o.get('description'): print('   desc:', o['description'][:220])
    for k,v in (o.get('fields') or {}).items():
        print('   field', k, '=', (str(v)[:120]))
print('RELS:')
for r in g.get('relationships', []):
    print('  ', r.get('subject'), r.get('predicate'), r.get('object'))
print('OWNER:', d.get('ownerObjectId') or 'n/a')
print('META keys:', list(d.get('meta',{}).keys()))
" 2>&1 | head -60
echo "=== TECHNOLOGY strategy profile ==="
grep -rn "TECHNOLOGY" src/fyd/builder/strategy-for-site.ts 2>/dev/null | head
grep -n "TECHNOLOGY" -A 30 src/fyd/archetypes/profiles.ts 2>/dev/null | head -60
