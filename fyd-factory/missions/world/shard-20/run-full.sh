echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard20
cd /home/nolan/ping-clean
rm -f /home/nolan/shard20/results.jsonl /home/nolan/shard20/stats.json
START=10000 END=10499 OUT_DIR=/home/nolan/shard20 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard20/results.jsonl
