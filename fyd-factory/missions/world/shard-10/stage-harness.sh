cp /mnt/c/Users/nolan/transfer/harness-shard1.ts /home/nolan/shard1/harness.ts
grep -c "0.15" /home/nolan/shard1/harness.ts || echo "stochastic gate gone"
