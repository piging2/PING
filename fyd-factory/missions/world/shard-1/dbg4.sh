cd /home/nolan/shard1
python3 -c "
import json
for line in open('results.jsonl'):
    r = json.loads(line)
    print(r['mission'], r['outcome'], r['failure_stage'])
    print('  counts:', r['counts'])
    print('  unsafe:', r['unsafe_url_count'], 'unbound:', r['unbound_claim_count'])
    for w in r['warnings']: print('  WARN:', w[:220])
"
