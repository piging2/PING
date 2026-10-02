#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== owner-proposal.ts imports ==="
grep -n "^import\|^} from" "$WT/src/fyd/customize/owner-proposal.ts" | head -20
echo "=== customize/propose.ts imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/customize/propose.ts" | head -20
echo "=== ask-composer node usage ==="
grep -n "node:" "$WT/src/lib/ping/ask-composer.ts" | head -5
grep -n "owner-overlay\|owner-store" "$WT/src/lib/ping/ask-composer.ts" | head -5
