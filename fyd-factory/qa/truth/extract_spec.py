import json

BS = chr(92)

def extract_spec(html):
    idx = html.find('fyd.sitespec@1')
    assert idx > 0, 'spec kind not found'
    tail = html[max(0, idx - 200):]
    dec = tail.encode('utf-8').decode('unicode_escape', errors='replace')
    sidx = dec.find('"kind":"fyd.sitespec@1"')
    assert sidx > 0, 'decoded kind not found'
    start = dec.rfind('{', 0, sidx)
    depth = 0; instr = False; esc = False; i = start
    while i < len(dec):
        ch = dec[i]
        if instr:
            if esc: esc = False
            elif ch == BS: esc = True
            elif ch == '"': instr = False
        else:
            if ch == '"': instr = True
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0: break
        i += 1
    return json.loads(dec[start:i+1])

for name, site in [('coppersmith.html', 'coppersmith'), ('happyplace.html', 'happyplace')]:
    raw = open(name, encoding='utf-8', errors='replace').read()
    spec = extract_spec(raw)
    open(site + '-spec.json', 'w').write(json.dumps(spec, indent=1))
    print(site, 'pages:', [(p['slug'], p['title']) for p in spec['pages']])
    print('  provenance:', json.dumps(spec.get('provenance')))
    for p in spec['pages']:
        for s in p['sections']:
            pres = s.get('presentation', {})
            print('   ', p['slug'], '|', s['id'], '|', s.get('kind'),
                  '| heading:', repr(pres.get('heading'))[:60],
                  '| copy:', repr(pres.get('copy'))[:90])
