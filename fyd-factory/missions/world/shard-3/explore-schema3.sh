#!/bin/bash
cd /home/nolan/projects/ping
echo "=== registry.ts line count ==="; wc -l src/fyd/components/registry.ts
echo "=== require( occurrences ==="; grep -n "require(" src/fyd/components/registry.ts | head
echo "=== imports ==="; grep -n "^import\|from \"" src/fyd/components/registry.ts | head -20
echo "=== direct node require test of schema-roles via tsx cjs ==="
NODE_OPTIONS="--require /home/nolan/fyd-shard3/preload.cjs" ./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json -e "const m = require('/home/nolan/projects/ping/src/fyd/sitespec/schema-roles.ts'); console.log('CJS-OK', typeof m.SCHEMA_ROLES);" 2>&1 | tail -8
