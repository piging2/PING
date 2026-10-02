#!/bin/bash
python3 - <<'EOF'
import json, os
res=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/results.jsonl') if l.strip()]
errs=[r['mission'] for r in res if r['outcome']=='GENERATOR_ERROR']
print("err missions:", sorted(errs)[:20])
fixs=sorted([os.path.join(dp,f) for dp,_,fs in os.walk('/home/nolan/fyd-fixtures-p0') for f in fs if f.endswith('.json')])
print("n fixtures:", len(fixs))
for m in sorted(errs)[:10]:
    print(m, "->", fixs[m % len(fixs)])
# try loading a couple
for m in sorted(errs)[:3]:
    p=fixs[m % len(fixs)]
    try:
        f=json.load(open(p))
        g=f.get('graph') or f
        print(p, "objs:", len(g.get('objects',[])), "keys:", list(g.keys())[:6])
    except Exception as e:
        print(p, "PARSE ERROR:", e)
EOF
