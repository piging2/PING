#!/bin/bash
set -e
mkdir -p /mnt/c/Users/nolan/transfer/proj-out
cp /home/nolan/fyd-projection-out/shard-0/results.jsonl /home/nolan/fyd-projection-out/shard-0/findings.jsonl /home/nolan/fyd-projection-out/shard-0/run-summary.json /mnt/c/Users/nolan/transfer/proj-out/
cp /home/nolan/fyd-projection-out/shard-0-fixed/run-summary.json /mnt/c/Users/nolan/transfer/proj-out/run-summary-fixed.json
ls -la /mnt/c/Users/nolan/transfer/proj-out/
