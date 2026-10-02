cp /mnt/c/Users/nolan/transfer/harness-shard1.ts /home/nolan/shard1/harness.ts
cd /home/nolan/ping-clean
rm -f /home/nolan/shard1/results.jsonl /home/nolan/shard1/stats.json
START=500 END=999 OUT_DIR=/home/nolan/shard1 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard1/results.jsonl
