#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
python3 - <<'PYEOF'
import json
cass = json.load(open('tests/ask-fyd/jev-shadow-cassette.json'))
new = {i['questionId']: i for i in json.load(open('tests/ask-fyd/shadow-inputs.json'))['items']}
print("header:", json.dumps(cass['header'], indent=1)[:400])
print("summary:", json.dumps(cass['summary'], indent=1)[:300])
e = cass['entries'][0]
print("entry keys:", sorted(e.keys()))
print("entry0:", json.dumps(e, indent=1)[:600])
PYEOF
