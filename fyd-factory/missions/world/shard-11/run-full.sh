echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard11
cd /home/nolan/ping-clean
rm -f /home/nolan/shard11/results.jsonl /home/nolan/shard11/stats.json
START=5500 END=5999 OUT_DIR=/home/nolan/shard11 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard11/results.jsonl
