#!/bin/bash
# LANE BCQ: final typecheck with correct typeRoots (repo's @types).
set -u
WT=/home/nolan/projects/ping-bcq-substrate
cat > /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json <<EOF
{
  "extends": "$WT/tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "typeRoots": ["/home/nolan/projects/ping/node_modules/@types"]
  },
  "include": ["$WT/src/fyd/connectors/kit/*.ts", "$WT/src/fyd/connectors/kit/__tests__/*.ts"]
}
EOF
/home/nolan/projects/ping/node_modules/.bin/tsc -p /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json 2>&1 | head -10
echo "TSC_EXIT=$?"
