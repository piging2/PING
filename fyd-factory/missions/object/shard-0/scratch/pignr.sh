python3 - <<'PYEOF'
import json
from collections import Counter
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.patched-0-99.jsonl') if l.strip()]
nr = [r for r in recs if r['outcome'] == 'NEEDS_REVIEW']
print('NEEDS_REVIEW:', len(nr))
print(Counter((r['mutation'], r['failure_stage']) for r in nr))
for r in nr[:12]:
    msgs = [f['message'][:80] for f in r['findings'] if f['severity'] in ('error','warning')][:2]
    print(r['mission'], r['mutation'], r['failure_stage'], '|', msgs)
PYEOF
