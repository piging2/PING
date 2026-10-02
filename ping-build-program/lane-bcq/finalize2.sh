#!/bin/bash
# LANE BCQ: re-run final typecheck without the artificial "types" restriction
# (the repo tsconfig does not restrict types; @types/jest+node come from node_modules).
set -u
WT=/home/nolan/projects/ping-bcq-substrate
cat > /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json <<EOF
{
  "extends": "$WT/tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["$WT/src/fyd/connectors/kit/*.ts", "$WT/src/fyd/connectors/kit/__tests__/*.ts"]
}
EOF
/home/nolan/projects/ping/node_modules/.bin/tsc -p /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json 2>&1 | head -10
echo "TSC done"
echo "=== @types/jest present? ==="
ls -d /home/nolan/projects/ping/node_modules/@types/jest 2>/dev/null || echo NO_JEST_TYPES
echo "=== final diff ==="
git -C "$WT" status --short
find "$WT/src/fyd/connectors" -type f | sort
