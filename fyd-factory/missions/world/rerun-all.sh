uptime
cd /home/nolan/ping-clean
for spec in "500 999 shard1r" "2000 2499 shard4" "2500 2999 shard5r" "5000 5499 shard10" "5500 5999 shard11" "6000 6499 shard12" "6500 6999 shard13" "7000 7499 shard14" "7500 7999 shard15" "8000 8499 shard16" "8500 8999 shard17" "9000 9499 shard18" "9500 9999 shard19" "10000 10499 shard20"; do
  set -- $spec
  rm -f /home/nolan/$3/results.jsonl /home/nolan/$3/stats.json
  START=$1 END=$2 OUT_DIR=/home/nolan/$3 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -1
  echo "range $1-$2 -> $3: $(wc -l < /home/nolan/$3/results.jsonl) lines"
done
