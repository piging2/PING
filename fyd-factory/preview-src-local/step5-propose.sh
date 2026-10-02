#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== propose.ts full structure ==="
grep -n "^export function\|^function\|^import\|^} from\|canonicalize\|createHash\|fs\.\|readFile\|writeFile" "$WT/src/fyd/customize/propose.ts" | head -40
echo "=== what is canonicalize in ask-composer? ==="
grep -n "export function canonicalize\|export const canonicalize" "$WT/src/lib/ping/ask-composer.ts"
echo "=== ask-composer imports (full) ==="
sed -n '1,30p' "$WT/src/lib/ping/ask-composer.ts"
