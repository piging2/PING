cp /mnt/c/Users/nolan/transfer/boot-dbg-shard1.cjs /home/nolan/shard1/boot-dbg.cjs
cd /home/nolan/ping-clean
echo "===================== world 501 (correct-fact) ====================="
HARNESS_MAIN=0 DBG_I=501 node /home/nolan/shard1/boot-dbg.cjs 2>&1 | grep -v "Warning: Unsupported" | head -40
echo "===================== world 500 (hide-object) ====================="
HARNESS_MAIN=0 DBG_I=500 node /home/nolan/shard1/boot-dbg.cjs 2>&1 | grep -v "Warning: Unsupported" | tail -10
