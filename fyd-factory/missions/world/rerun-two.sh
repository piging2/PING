cd /home/nolan/ping-clean
rm -f /home/nolan/shard1/results.jsonl /home/nolan/shard1/stats.json
START=500 END=999 OUT_DIR=/home/nolan/shard1 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -1
echo "range 500-999: $(wc -l < /home/nolan/shard1/results.jsonl) lines"
rm -f /home/nolan/shard5/results.jsonl /home/nolan/shard5/stats.json
START=2500 END=2999 OUT_DIR=/home/nolan/shard5 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -1
echo "range 2500-2999: $(wc -l < /home/nolan/shard5/results.jsonl) lines"
