#!/bin/bash
# FIXTURE-SECOND probe2: claimKind values, faq/claim schemas, person/external_identity shapes, phone uniqueness
cd /home/nolan/projects/ping || exit 1
echo "=== claimKind values in fixtures ==="
for f in /home/nolan/ping/var/fyd-projections/happy-place.json /home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json /home/nolan/ping/var/fyd-projections/ping-fyd.json; do
  echo "--- $f"
  python3 -c "
import json, collections
d = json.load(open('$f'))
c = collections.Counter()
for o in d['graph']['objects']:
    ck = (o.get('fields') or {}).get('claimKind')
    if ck: c[(o.get('schema'), ck)] += 1
print(dict(c))
"
done
echo "=== faq schema anywhere in src/fyd? ==="
grep -rn "ping\..*faq" src/fyd --include="*.ts" -il | head -5
grep -rn "\"faq\"\|'faq'" src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts 2>/dev/null | head -5
echo "=== claim schema ids ==="
grep -rhn "ping\.[a-z]*\.[a-z_]*@[0-9]" src/fyd/sitespec/schemas.ts | head -20
echo "=== person object sample (coppersmith) ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
for o in d['graph']['objects']:
    if o['schema'] == 'ping.social.person@1':
        print(json.dumps(o, indent=1)[:1200])
"
echo "=== external_identity sample ==="
python3 -c "
import json
d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
for o in d['graph']['objects']:
    if o['schema'] == 'ping.social.external_identity@1':
        print(json.dumps(o, indent=1)[:900])
"
echo "=== phones across all fixtures (uniqueness check) ==="
grep -rhoE "(\+1[- ]?)?\(?[0-9]{3}\)?[- .][0-9]{3}[- .][0-9]{4}" /home/nolan/ping/var/fyd-projections/*.json | sort | uniq -c
echo "=== 555 numbers anywhere? ==="
grep -rl "555-01" /home/nolan/ping/var/fyd-projections/*.json || echo "none"
