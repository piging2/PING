#!/bin/bash
set -u
SRC="/mnt/c/Users/nolan/transfer/context-compiler.ts"
DST="/home/nolan/projects/ping/src/fyd/ask/context-compiler.ts"
if [ -e "$DST" ]; then echo "REFUSE: dest exists (never overwrite)"; exit 1; fi
cp "$SRC" "$DST"
echo "--- sha256 ---"
sha256sum "$DST"
echo "--- git status (ask dir only) ---"
cd /home/nolan/projects/ping && git status --short src/fyd/ask/
echo "--- tsc check (lane-scoped) ---"
cd /home/nolan/projects/ping
npx tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck --types node src/fyd/ask/context-compiler.ts 2>&1 | head -30 || true
echo "--- node smoke: import shape via tsx? (skip if absent) ---"
command -v tsx >/dev/null && tsx -e "import('./src/fyd/ask/context-compiler.ts').then(m => console.log('exports:', Object.keys(m).join(',')))" || echo "no tsx; tsc pass is the gate"
