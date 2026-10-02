#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== proceduralize/sha256.ts ==="
cat "$WT/src/fyd/proceduralize/sha256.ts"
echo "=== draftOwnerProposal body (lines 569-603) ==="
sed -n '569,603p' "$WT/src/fyd/customize/owner-proposal.ts"
