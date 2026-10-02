cd /home/nolan/projects/ping
rm -f /home/nolan/fyd-missions/shard-0/results.500-999.jsonl
node /home/nolan/fyd-missions/shard-0/harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/results.500-999.jsonl 500 1000 /home/nolan/fyd-missions/shard-0/progress.500-999.log >/dev/null 2>&1; echo EXIT=$?
python3 - <<'PYEOF'
import json
from collections import Counter
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.500-999.jsonl') if l.strip()]
print('records:', len(recs))
print('outcomes:', dict(Counter(r['outcome'] for r in recs)))
leaks = [r for r in recs if r['mutation']=='unbound-claim' and r['sentinel_rendered']]
print('unbound-claim leaks:', len(leaks))
for r in leaks:
    print(' LEAK mission', r['mission'], '| fixture', r['fixture'], '| category', r.get('category'))
PYEOF
