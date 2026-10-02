cp /mnt/c/Users/nolan/transfer/harness-shard1.ts /home/nolan/shard1/harness.ts
cp /mnt/c/Users/nolan/transfer/debug-shard1.ts /home/nolan/shard1/debug.ts
cd /home/nolan/ping-clean
HARNESS_MAIN=0 DBG_I=501 node /home/nolan/shard1/boot.cjs 2>/dev/null
echo "===================== world 500 (hide-object) ====================="
HARNESS_MAIN=0 DBG_I=500 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -8
