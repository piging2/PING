cd /home/nolan/projects/ping
START=500 END=500 OUT_DIR=/home/nolan/shard1 \
  node --import /home/nolan/shard1/register.mjs ./node_modules/.bin/tsx --tsconfig ./tsconfig.json /home/nolan/shard1/harness.ts 2>&1 | head -12
echo "===== registry.ts imports ====="
sed -n '1,40p' src/fyd/components/registry.ts | grep -n "import" 
