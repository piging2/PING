#!/bin/bash
cd /home/nolan/projects/ping
export NODE_OPTIONS="--require /home/nolan/fyd-shard3/preload.cjs"
echo "=== import generator.ts only ==="
./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json --eval 'import("./src/fyd/proceduralize/generator.ts").then(m => console.log("GEN-OK", m.GENERATOR_VERSION)).catch(e => console.log("GEN-FAIL", e.message))' 2>&1 | tail -6
echo "=== import registry.ts only ==="
./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json --eval 'import("./src/fyd/components/registry.ts").then(m => console.log("REG-OK")).catch(e => console.log("REG-FAIL", e.message))' 2>&1 | tail -6
