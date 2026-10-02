echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard15
cd /home/nolan/ping-clean
rm -f /home/nolan/shard15/results.jsonl /home/nolan/shard15/stats.json
START=7500 END=7999 OUT_DIR=/home/nolan/shard15 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard15/results.jsonl
