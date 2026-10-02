#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/harness.ts /home/nolan/fyd-projection-harness/harness.ts
sha256sum /home/nolan/fyd-projection-harness/harness.ts
rm -f /mnt/c/Users/nolan/transfer/harness.ts
# fresh outputs for the real run
rm -f /home/nolan/fyd-projection-out/shard-0/results.jsonl /home/nolan/fyd-projection-out/shard-0/findings.jsonl /home/nolan/fyd-projection-out/shard-0/run-summary.json
cd /home/nolan/projects/ping
# re-smoke 6 missions to confirm verifier calibration
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=0 --end=6 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-0 2>&1 | tail -3
