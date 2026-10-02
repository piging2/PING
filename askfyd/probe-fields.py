import re
src = open('/home/nolan/projects/ping-askfyd-gold/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts').read()
i = src.find('"id": "website-business-2f1327c09d622175",')
seg = src[i:i+2500]
for f in ['phone', 'email', 'website']:
    m = re.search('"' + f + '": "([^"]*)"', seg)
    print(f, '=>', m.group(1) if m else None)
# service ids and names
for m in re.finditer(r'"id": "(website-business-2f1327c09d622175-svc-[a-f0-9]+)"[\s\S]{0,200}?"title": "([^"]*)"', src):
    print('svc', m.group(1)[-12:], '=>', m.group(2))
