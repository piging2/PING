python3 - <<'PYEOF'
import json
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.patched-0-99.jsonl') if l.strip()]
r = next(x for x in recs if x['mission'] == 30)
for k in ('mission','fixture','category','mutation','outcome','failure_stage','unsafe_url_count','unbound_claim_count','sentinel_rendered','hidden_leaked_count','pages','sections'):
    print(k, '=', r[k])
print('findings:', r['findings'][:3])
PYEOF
