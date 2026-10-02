#!/bin/bash
# LANE BCQ: verify kit in place inside the isolated worktree.
# 1) tsc --noEmit under the repo's tsconfig settings (temp config, not committed)
# 2) emit to /tmp and run the suite with node (runtime proof in place)
set -u
WT=/home/nolan/projects/ping-bcq-substrate
TSC=/home/nolan/projects/ping/node_modules/.bin/tsc
KIT="$WT/src/fyd/connectors/kit"
OUT=/tmp/kit-out
rm -rf "$OUT"
mkdir -p "$OUT"
cat > /mnt/c/Users/nolan/transfer/tsconfig.kit-check.json <<EOF
{
  "extends": "$WT/tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "$OUT",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["$KIT/*.ts"]
}
EOF
echo "=== typecheck (repo settings) ==="
"$TSC" -p /mnt/c/Users/nolan/transfer/tsconfig.kit-check.json 2>&1 | head -20
echo "TSC_EXIT=$?"
echo '{"type":"module"}' > "$OUT/package.json"
echo "=== runtime: contract suite in place ==="
node "$OUT/run.js" 2>&1 | tail -3
echo "=== jest config location ==="
grep -n '"jest"' -A 8 "$WT/package.json" | head -12
ls "$WT/src/fyd/jest.config.cjs" 2>/dev/null
