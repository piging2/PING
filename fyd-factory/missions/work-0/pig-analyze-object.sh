#!/bin/bash
python3 - <<'PYEOF'
import json, collections
for name, path in [('shard5','/home/nolan/fyd-wave2/out5/results.jsonl'), ('shard6','/home/nolan/fyd-wave2/out6/results.jsonl')]:
    notes = collections.Counter()
    fx = collections.Counter()
    det = 0
    unsafe = 0
    unbound = 0
    leak = 0
    for line in open(path):
        r = json.loads(line)
        if r['outcome'] == 'NEEDS_REVIEW':
            notes[(r['failure_stage'], (r['failure_note'] or '')[:80])] += 1
            fx[r.get('fixture','?')] += 1
        if r.get('determinism_ok'): det += 1
        unsafe += r.get('unsafe_url_count', 0)
        unbound += r.get('unbound_claim_count', 0)
        for w in r.get('warnings', []):
            if 'leak' in w.lower(): leak += 1
    print(f"== {name} ==")
    print("determinism_ok:", det, "| total unsafe:", unsafe, "| total unbound sections:", unbound, "| leak warnings:", leak)
    print("NEEDS_REVIEW notes:")
    for k, v in notes.most_common(): print(" ", v, k)
    print("fixtures with NEEDS_REVIEW:", dict(fx))
PYEOF
