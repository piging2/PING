#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/harness.ts /home/nolan/fyd-projection-harness/harness.ts
rm -f /mnt/c/Users/nolan/transfer/harness.ts
cd /home/nolan/fyd-projection-harness
git add harness.ts
git -c user.email=factory@local -c user.name=factory commit -qm "harness v3: fixture fail-closed selection, owner-phone 555-02xx range, stale-check guard, hidden-address evidence"
git log --oneline | head -4
# clean final run
rm -f /home/nolan/fyd-projection-out/shard-0/results.jsonl /home/nolan/fyd-projection-out/shard-0/findings.jsonl /home/nolan/fyd-projection-out/shard-0/run-summary.json
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=0 --end=500 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-0 2>&1 | tail -8
