#!/bin/bash
cd /home/nolan/projects/ping
export NODE_OPTIONS="--require /home/nolan/fyd-shard3/preload.cjs"
./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json --eval 'try { const m = await import("./src/fyd/components/registry.ts"); console.log("REG-OK"); } catch (e) { console.log("REG-FAIL:", e.message); }' 2>&1 | head -8
echo "---exit:$?"
