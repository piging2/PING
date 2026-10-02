echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard18
cd /home/nolan/ping-clean
rm -f /home/nolan/shard18/results.jsonl /home/nolan/shard18/stats.json
START=9000 END=9499 OUT_DIR=/home/nolan/shard18 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard18/results.jsonl
