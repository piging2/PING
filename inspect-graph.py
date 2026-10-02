import json

d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
g = d['graph']
print('META:', json.dumps(d.get('meta', {}), indent=1)[:800])
print()
for o in g['objects']:
    print('ID:', o['id'])
    print('  schema:', o['schema'], '| vis:', o['visibility'], '| title:', o['title'])
    print('  provenance:', json.dumps(o.get('provenance')))
    fields = o.get('fields') or {}
    keys = list(fields.keys())
    print('  field keys:', keys[:20])
    print('  title binding:', fields.get('title'))
print()
print('REL count:', len(g.get('relationships', [])))
