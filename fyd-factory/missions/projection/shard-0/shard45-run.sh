#!/bin/bash
set -e
cd /home/nolan/projects/ping
for SH in 4 5; do
  S=$((SH*500)); E=$((S+500))
  ./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=$S --end=$E --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-$SH 2>&1 | grep RUN_SUMMARY | python3 -c "import json,sys; s=json.loads(sys.stdin.read().split('RUN_SUMMARY ',1)[1]); print('shard-$SH', s['outcomes'])"
done
echo "=== finding classes ==="
python3 - <<'EOF'
import json
from collections import Counter
for sh in [4,5]:
    fs=[json.loads(l) for l in open(f'/home/nolan/fyd-projection-out/shard-{sh}/findings.jsonl') if l.strip()]
    print(f"shard-{sh}:", Counter((f['CLASSIFICATION'], f['signature'].split(':')[1]) for f in fs).most_common(5))
EOF
mkdir -p /mnt/c/Users/nolan/transfer/proj-out45
for SH in 4 5; do mkdir -p /mnt/c/Users/nolan/transfer/proj-out45/$SH; cp /home/nolan/fyd-projection-out/shard-$SH/results.jsonl /home/nolan/fyd-projection-out/shard-$SH/findings.jsonl /home/nolan/fyd-projection-out/shard-$SH/run-summary.json /mnt/c/Users/nolan/transfer/proj-out45/$SH/; done
ls /mnt/c/Users/nolan/transfer/proj-out45/
