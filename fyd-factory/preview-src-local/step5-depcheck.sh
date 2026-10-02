#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== clean-tree dep check ==="
for f in src/fyd/customize/intent.ts src/fyd/customize/types.ts src/fyd/customize/propose.ts src/fyd/proceduralize/patch.ts src/fyd/proceduralize/sha256.ts src/fyd/owner-mode/gate.ts src/fyd/owner-mode/capability.ts; do
  [ -f "$WT/$f" ] && echo "OK $f" || echo "MISSING $f"
done
echo "=== components/renderer ==="
ls "$WT/src/fyd/components/renderer"* 2>&1 | head -3
