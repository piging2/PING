#!/bin/bash
# LANE BCQ: finalize - remove env symlink, final typecheck, confirm clean diff.
set -u
WT=/home/nolan/projects/ping-bcq-substrate
rm -f "$WT/node_modules"
echo "=== final status (must show ONLY src/fyd/connectors/) ==="
git -C "$WT" status --short
echo "=== final tsc --noEmit on integrated files (repo settings) ==="
cat > /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json <<EOF
{
  "extends": "$WT/tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["$WT/src/fyd/connectors/kit/*.ts", "$WT/src/fyd/connectors/kit/__tests__/*.ts"]
}
EOF
/home/nolan/projects/ping/node_modules/.bin/tsc -p /mnt/c/Users/nolan/transfer/tsconfig.kit-final.json 2>&1 | head -10
echo "TSC_EXIT=$?"
echo "=== worktree branch ==="
git -C "$WT" branch --show-current
echo "=== main checkout untouched? ==="
git -C /home/nolan/projects/ping status --short | head -3
git -C /home/nolan/projects/ping branch --show-current
