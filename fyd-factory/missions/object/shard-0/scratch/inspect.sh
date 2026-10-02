python3 -c "
import json
recs = {json.loads(l)['mission']: json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/pc.jsonl')}
for m in (15, 30):
    r = recs[m]
    print('=== mission', m, r['mutation'], r['fixture'], r['outcome'], r['failure_stage'])
    for f in r['findings']:
        print('  ', f['severity'], f['path'], '-', f['message'][:220])
"
