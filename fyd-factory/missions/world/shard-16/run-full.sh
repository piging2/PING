echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard16
cd /home/nolan/ping-clean
rm -f /home/nolan/shard16/results.jsonl /home/nolan/shard16/stats.json
START=8000 END=8499 OUT_DIR=/home/nolan/shard16 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard16/results.jsonl
