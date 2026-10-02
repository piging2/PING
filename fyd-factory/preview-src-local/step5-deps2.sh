#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== owner-command-compiler: what does it import from renderer? ==="
grep -n "renderer" "$WT/src/fyd/customize/owner-command-compiler.ts"
echo "=== proceduralize/patch.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/proceduralize/patch.ts" | head -10
echo "=== owner-mode/capability.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/capability.ts" | head -10
echo "=== customize/intent.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/customize/intent.ts" | head -10
echo "=== customize/types.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/customize/types.ts" | head -10
echo "=== owner-mode/corrections.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/corrections.ts" | head -10
echo "=== owner-mode/provenance.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/provenance.ts" | head -10
echo "=== owner-mode/facts.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/facts.ts" | head -10
echo "=== owner-mode/visibility-policy.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/visibility-policy.ts" | head -10
