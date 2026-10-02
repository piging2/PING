echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard4
cd /home/nolan/ping-clean
rm -f /home/nolan/shard4/results.jsonl /home/nolan/shard4/stats.json
START=2000 END=2499 OUT_DIR=/home/nolan/shard4 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard4/results.jsonl
