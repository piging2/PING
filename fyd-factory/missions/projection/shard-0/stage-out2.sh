#!/bin/bash
set -e
mkdir -p /mnt/c/Users/nolan/transfer/proj-out2
cp /home/nolan/fyd-projection-out/shard-2/results.jsonl /home/nolan/fyd-projection-out/shard-2/findings.jsonl /home/nolan/fyd-projection-out/shard-2/run-summary.json /mnt/c/Users/nolan/transfer/proj-out2/
cp /home/nolan/fyd-projection-out/shard-2-fixed/run-summary.json /mnt/c/Users/nolan/transfer/proj-out2/run-summary-fixed.json
ls /mnt/c/Users/nolan/transfer/proj-out2/
