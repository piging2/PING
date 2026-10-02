#!/bin/bash
cd /home/nolan/projects/ping
python3 -c "
import json
d = json.load(open('src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json'))
g = d['graph']
for o in g['objects']:
    hrs = o.get('fields', {}).get('hours')
    if hrs:
        print(o['id'], '|', o['schema'], '|', o['visibility'])
        print('  hours:', hrs)
        print('  prov:', o.get('provenance'))
    if o['schema'] == 'ping.social.person@1':
        print('PERSON:', o['id'], '|', o.get('title'), '| fields:', {k:v for k,v in o.get('fields',{}).items()})
print()
print('n rels:', len(g['relationships']))
print('rel preds:', sorted(set(r.get('predicate') for r in g['relationships'])))
print()
for o in g['objects']:
    if 'owner' in json.dumps(o.get('provenance',{})):
        print('OWNER-PROV:', o['id'], o['provenance'])
"
