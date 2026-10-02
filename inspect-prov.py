import json, collections

d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
g = d['graph']
print('provenance kinds:', collections.Counter(json.dumps(o.get('provenance', {}).get('kind')) for o in g['objects']))
print('claimKinds:', collections.Counter(str((o.get('fields') or {}).get('claimKind')) for o in g['objects']))
print('status fields:', collections.Counter(str((o.get('fields') or {}).get('status')) for o in g['objects']))
print()
print('sample refs:')
for o in g['objects'][:4]:
    print(' ', (o.get('provenance') or {}).get('ref'))
