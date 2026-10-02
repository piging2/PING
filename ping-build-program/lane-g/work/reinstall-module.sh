#!/bin/bash
set -u
SRC="/mnt/c/Users/nolan/transfer/context-compiler.ts"
DST="/home/nolan/projects/ping/src/fyd/ask/context-compiler.ts"
cp "$SRC" "$DST"
sha256sum "$DST"
cd /home/nolan/projects/ping
echo "--- lane-scoped tsc (repo tsconfig paths) ---"
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "fyd/ask/context-compiler" | head -10 || echo "no context-compiler errors under repo tsconfig"
echo "--- repo-wide new errors vs baseline? (count only) ---"
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS" || true
echo "--- git status ask dir ---"
git status --short src/fyd/ask/
