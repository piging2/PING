echo "--- saturation check ---"
uptime
LOAD1=$(awk '{print $1}' /proc/loadavg); NPROC=$(nproc)
echo "load1=$LOAD1 nproc=$NPROC"
mkdir -p /home/nolan/shard5
cd /home/nolan/ping-clean
rm -f /home/nolan/shard5/results.jsonl /home/nolan/shard5/stats.json
START=2500 END=2999 OUT_DIR=/home/nolan/shard5 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "EXIT:$?"
wc -l /home/nolan/shard5/results.jsonl
