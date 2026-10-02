cd /home/nolan/fyd-missions/shard-0 && SHARD_DEBUG=1 node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/dbg.jsonl 51 52 /home/nolan/fyd-missions/shard-0/dbg.log 2>/dev/null; SHARD_DEBUG=1 node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/dbg2.jsonl 30 31 /home/nolan/fyd-missions/shard-0/dbg2.log 2>/dev/null; python3 -c "
import json
for f in ('/home/nolan/fyd-missions/shard-0/dbg.jsonl','/home/nolan/fyd-missions/shard-0/dbg2.jsonl'):
    for l in open(f):
        r=json.loads(l)
        print(r['mission'], r['mutation'], r['outcome'], r['fixture'].split('/')[-1])
        print('  debug:', json.dumps(r.get('debug'), indent=1)[:900])
"
