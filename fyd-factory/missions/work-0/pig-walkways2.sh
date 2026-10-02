#!/bin/bash
F=/home/nolan/fyd-factory-shard2/corpus/fixtures/batch-b/batch-b-landscaper.json
echo "=== hidden object fixture-b-alder-creek-service-21 ==="
python3 -c "
import json
d = json.load(open('$F'))
g = d['graph']
for o in g['objects']:
    if o['id'] == 'fixture-b-alder-creek-service-21':
        print(json.dumps(o, indent=1)[:1500])
"
echo "=== other objects mentioning walkways (case-insensitive) ==="
python3 -c "
import json, re
d = json.load(open('$F'))
g = d['graph']
for o in g['objects']:
    if o['id'] == 'fixture-b-alder-creek-service-21': continue
    blob = json.dumps(o)
    for m in re.finditer(r'.{60}[Ww]alkways.{60}', blob):
        print(o['id'], '|', o.get('visibility'), '|', m.group(0)[:130].replace(chr(10),' '))
        break
"
