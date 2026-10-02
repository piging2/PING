#!/bin/bash
set -e
WT=/home/nolan/projects/ping-bcq-substrate
cd "$WT"
echo "== enum region =="
sed -n '18,40p' src/fyd/connectors/kit/types.ts
echo "== full worktree status =="
git status --short | head -15
echo "== tsc strict on the kit files =="
node --version
# use the kit's own jest tsconfig? just typecheck the single file with ignoreConfig
npx --yes -p typescript tsc --ignoreConfig --noEmit --strict --noUnusedLocals --noUnusedParameters --target es2022 --module nodenext --moduleResolution nodenext src/fyd/connectors/kit/types.ts 2>&1 | head -10
echo "tsc-exit=$?"
