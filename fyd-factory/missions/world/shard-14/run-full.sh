echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard14
cd /home/nolan/ping-clean
rm -f /home/nolan/shard14/results.jsonl /home/nolan/shard14/stats.json
START=7000 END=7499 OUT_DIR=/home/nolan/shard14 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard14/results.jsonl
