#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
for m in coppersmith-plumbing happy-place; do
  echo "########## media manifest: $m ##########"
  python3 -c "
import json
d = json.load(open('src/fyd/media/manifests/$m.json'))
print('top-level keys:', list(d.keys())[:20])
def count_media(x, depth=0):
    if isinstance(x, dict):
        if 'url' in x or 'src' in x or 'href' in x:
            return 1
        return sum(count_media(v, depth+1) for v in x.values())
    if isinstance(x, list):
        return sum(count_media(v, depth+1) for v in x)
    return 0
print('approx media entries:', count_media(d))
print('bytes:', len(open('src/fyd/media/manifests/$m.json').read()))
"
done
echo "=== schema roles check for knowledge schemas ==="
grep -n "SCHEMA_ROLES" src/fyd/sitespec/schemas.ts | head -10
grep -n "knowledge" src/fyd/sitespec/schemas.ts | head -20
