cd /home/nolan/fyd-missions/shard-0 && node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/smoke2.jsonl 6 14 /home/nolan/fyd-missions/shard-0/smoke2.log && python3 -c "
import json
for l in open('/home/nolan/fyd-missions/shard-0/smoke2.jsonl'):
    r=json.loads(l); print(r['mission'], r['mutation'], r['outcome'], r['failure_stage'], 'unsafe=',r['unsafe_url_count'],'unbound=',r['unbound_claim_count'],'hidden_leak=',r['hidden_leaked_count'],'det=',r['determinism']['match'])
"
