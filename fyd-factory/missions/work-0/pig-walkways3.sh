#!/bin/bash
F=/home/nolan/fyd-factory-shard2/corpus/fixtures/batch-b-landscaper.json
python3 - "$F" <<'PYEOF'
import json, re, sys
d = json.load(open(sys.argv[1]))
g = d['graph']
for o in g['objects']:
    if o['id'] == 'fixture-b-alder-creek-service-21':
        print("HIDDEN OBJECT:")
        print(json.dumps(o, indent=1)[:1200])
        print()
print("OTHER OBJECTS MENTIONING 'walkways' (case-insensitive):")
for o in g['objects']:
    if o['id'] == 'fixture-b-alder-creek-service-21': continue
    blob = json.dumps(o)
    for m in re.finditer(r'.{0,70}[Ww]alkways.{0,70}', blob):
        print(o['id'], '|', o.get('visibility'), '|', m.group(0).replace(chr(10),' ')[:150])
        break
PYEOF
