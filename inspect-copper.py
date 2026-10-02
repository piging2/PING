import json, glob, os
base = '/home/nolan/projects/ping/src/fyd/object/__tests__/fixtures/projections'
print('fixtures:', sorted(os.listdir(base)))
p = os.path.join(base, 'coppersmith-plumbing.json')
g = json.load(open(p))
graph = g['graph'] if 'graph' in g else g
objs = graph['objects']
b = [o for o in objs if o['id'] == 'website-business-2f1327c09d622175'][0]
print('schema:', b['schema'])
print('controllerId:', b.get('controllerId'))
for k in ['phone', 'website', 'email', 'locality']:
    print(k, '=', repr(b['fields'].get(k))[:100])
print('title:', b['title'][:60])
print('n_objects:', len(objs), 'n_rels:', len(graph['relationships']))
