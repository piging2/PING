cp /mnt/c/Users/nolan/transfer/harness-shard1.ts /home/nolan/shard1/harness.ts
cd /home/nolan/projects/ping
rm -f /home/nolan/shard1/results.jsonl /home/nolan/shard1/stats.json
START=500 END=502 OUT_DIR=/home/nolan/shard1 \
  ./node_modules/.bin/tsx --tsconfig ./tsconfig.json /home/nolan/shard1/harness.ts 2>&1 | tail -25
echo "--- results sample ---"
head -3 /home/nolan/shard1/results.jsonl 2>/dev/null | cut -c1-500
