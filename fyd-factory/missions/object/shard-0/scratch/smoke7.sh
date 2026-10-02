cd /home/nolan/fyd-missions/shard-0 && rm -f pc.jsonl && node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/pc.jsonl 0 45 /home/nolan/fyd-missions/shard-0/pc.log 2>/dev/null && python3 -c "
import json
for l in open('/home/nolan/fyd-missions/shard-0/pc.jsonl'):
    r=json.loads(l)
    if r['mutation'] in ('unsafe-url-owner','hide-owner','unbound-claim','hide-object','unsafe-url'):
        print(r['mission'], r['mutation'], r['outcome'], r['failure_stage'], 'unsafe=',r['unsafe_url_count'],'unbound=',r['unbound_claim_count'],'hidden_leak=',r['hidden_leaked_count'],'det=',r['determinism']['match'])
"
