import json

d = json.load(open('/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json'))
g = d['graph']
svc = [o for o in g['objects'] if o['id'] == 'website-business-2f1327c09d622175-service-139408827c27'][0]
print(json.dumps(svc.get('fields'), indent=1))
print('---- renderer: where ObjectAffordance / WhyThis appears ----')
