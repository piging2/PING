echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard10
cd /home/nolan/ping-clean
rm -f /home/nolan/shard10/results.jsonl /home/nolan/shard10/stats.json
START=5000 END=5499 OUT_DIR=/home/nolan/shard10 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard10/results.jsonl
