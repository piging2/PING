echo "--- saturation check ---"
uptime
mkdir -p /home/nolan/shard17
cd /home/nolan/ping-clean
rm -f /home/nolan/shard17/results.jsonl /home/nolan/shard17/stats.json
START=8500 END=8999 OUT_DIR=/home/nolan/shard17 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard17/results.jsonl
