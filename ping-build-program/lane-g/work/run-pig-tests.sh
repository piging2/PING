#!/bin/bash
set -u
SRC="/mnt/c/Users/nolan/transfer/context-compiler.test.ts"
DST="/home/nolan/projects/ping/src/fyd/ask/__tests__/context-compiler.test.ts"
if [ -e "$DST" ]; then echo "REFUSE: dest exists"; exit 1; fi
cp "$SRC" "$DST"
sha256sum "$DST"
cd /home/nolan/projects/ping
echo "--- run lane jest suite (context-compiler only) ---"
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/ask/__tests__/context-compiler.test.ts 2>&1 | tail -25
echo "--- git status (untracked only, no shared edits) ---"
git status --short | grep -v "^ M" || echo "no modifications; untracked:"
git status --short | grep "^??"
