echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard13
cd /home/nolan/ping-clean
rm -f /home/nolan/shard13/results.jsonl /home/nolan/shard13/stats.json
START=6500 END=6999 OUT_DIR=/home/nolan/shard13 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard13/results.jsonl
