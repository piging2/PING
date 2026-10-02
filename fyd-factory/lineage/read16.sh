#!/bin/bash
cd /home/nolan/fyd-proof-run || exit 1
echo "===== step1-observations-coppersmith keys ====="
python3 -c "
import json
d = json.load(open('step1-observations-coppersmith-plumbing.json'))
def walk(o, p='', depth=0):
    if depth > 2: return
    if isinstance(o, dict):
        for k,v in o.items():
            print(p+k, type(v).__name__, (len(v) if isinstance(v,(list,dict)) else v if not isinstance(v,(dict,list)) else ''))
            walk(v, p+k+'.', depth+1)
    elif isinstance(o, list) and o:
        print(p+'[0]:', type(o[0]).__name__)
        walk(o[0], p+'[0].', depth+1)
walk(d)
" 2>&1 | head -60
echo "===== regen.ts head ====="
head -80 regen.ts
