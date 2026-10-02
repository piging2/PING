echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard19
cd /home/nolan/ping-clean
rm -f /home/nolan/shard19/results.jsonl /home/nolan/shard19/stats.json
START=9500 END=9999 OUT_DIR=/home/nolan/shard19 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard19/results.jsonl
