python3 - <<'PYEOF'
import json
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.500-999.jsonl') if l.strip()]
for m in (780, 915):
    r = next(x for x in recs if x['mission'] == m)
    print(m, r['outcome'], r['failure_stage'], 'unbound_claim_count =', r['unbound_claim_count'], '| fixture', r['fixture'])
PYEOF
