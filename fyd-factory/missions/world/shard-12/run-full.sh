echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard12
cd /home/nolan/ping-clean
rm -f /home/nolan/shard12/results.jsonl /home/nolan/shard12/stats.json
START=6000 END=6499 OUT_DIR=/home/nolan/shard12 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard12/results.jsonl
