#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1,60p' src/fyd/components/registry.ts
echo "=== find any './schema-roles' string in repo ==="
grep -rn '"./schema-roles"' src --include="*.ts" --include="*.tsx" | head
echo "=== tsx version ==="
./node_modules/.bin/tsx --version
