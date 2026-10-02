cp /mnt/c/Users/nolan/transfer/harness-shard1.ts /home/nolan/shard1/harness.ts
cd /home/nolan/ping-clean
rm -f /home/nolan/shard1/results.jsonl /home/nolan/shard1/stats.json
START=495 END=510 OUT_DIR=/home/nolan/shard1 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -6
python3 -c "
import json
from collections import Counter
c = Counter()
for line in open('/home/nolan/shard1/results.jsonl'):
    r = json.loads(line); c[r['outcome']] += 1
    if r['outcome'] not in ('GENERATED','GENERATED_WITH_WARNINGS'):
        print(r['mission'], r['outcome'], r['failure_stage'], r['warnings'][:2])
print('distribution:', dict(c))
"
