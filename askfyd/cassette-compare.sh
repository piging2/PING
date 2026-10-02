#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
python3 - <<'PYEOF'
import json
cass = json.load(open('tests/ask-fyd/jev-shadow-cassette.json'))
new = {i['questionId']: i for i in json.load(open('tests/ask-fyd/shadow-inputs.json'))['items']}
match = mismatch = missing = 0
for e in cass['entries']:
    qid = e['question_id']
    ch = (e.get('decisions') or {}).get('choice')
    if not ch:
        continue
    jev_pick = (ch.get('answer') or {}).get('choice')
    n = new.get(qid)
    if not n:
        missing += 1
        print("MISSING in new inputs:", qid)
        continue
    new_top = n['baselineTopEvidenceId']
    if jev_pick == new_top:
        match += 1
    else:
        mismatch += 1
        print(f"MISMATCH {qid}: jev_pick={jev_pick} new_top={new_top}")
print(f"match={match} mismatch={mismatch} missing={missing}")
PYEOF
