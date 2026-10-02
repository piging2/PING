#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
npx tsx tests/ask-fyd/dump-shadow-inputs.mts
python3 - <<'PYEOF'
import json
cass = json.load(open('tests/ask-fyd/jev-shadow-cassette.json'))
new = json.load(open('tests/ask-fyd/shadow-inputs.json'))
# cassette structure inspection
print("cassette keys:", list(cass.keys())[:8])
items = new['items']
print("new inputs:", len(items))
# find cassette's recorded digests/ids
def find_calls(o, depth=0):
    if depth > 4: return
    if isinstance(o, dict):
        if 'question-id' in o or 'questionId' in o:
            print("call keys:", sorted(o.keys())[:10])
            return True
        for v in o.values():
            if find_calls(v, depth+1): return True
    elif isinstance(o, list):
        for v in o[:3]:
            if find_calls(v, depth+1): return True
    return False
find_calls(cass)
PYEOF
