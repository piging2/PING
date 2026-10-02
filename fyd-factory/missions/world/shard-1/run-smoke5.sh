cp /mnt/c/Users/nolan/transfer/boot-shard1.cjs /home/nolan/shard1/boot.cjs
cd /home/nolan/ping-clean
rm -f /home/nolan/shard1/results.jsonl /home/nolan/shard1/stats.json
START=500 END=502 OUT_DIR=/home/nolan/shard1 node /home/nolan/shard1/boot.cjs 2>&1 | tail -25
echo "--- results sample ---"
head -3 /home/nolan/shard1/results.jsonl 2>/dev/null | cut -c1-400
