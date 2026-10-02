#!/bin/bash
cd /home/nolan/projects/ping
echo "=== all schema-roles mentions in registry.ts ==="; grep -n "schema-roles" src/fyd/components/registry.ts
echo "=== head of schema-roles.ts ==="; head -20 src/fyd/sitespec/schema-roles.ts
echo "=== any extensionless requires failing? test direct tsx import ==="
./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json -e "import('/home/nolan/projects/ping/src/fyd/sitespec/schema-roles.ts').then(m=>console.log('OK', Object.keys(m).slice(0,5)))" 2>&1 | tail -5
