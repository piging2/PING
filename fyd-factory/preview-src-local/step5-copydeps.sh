#!/bin/bash
set -uo pipefail
MAIN=/home/nolan/projects/ping
WT=/home/nolan/fyd-preview-wt
FILES="src/fyd/ask/concierge.ts src/fyd/owner-mode/demo-owner-console.tsx src/fyd/owner-mode/corrections.ts src/fyd/owner-mode/provenance.ts src/fyd/owner-mode/facts.ts src/fyd/owner-mode/visibility-policy.ts src/fyd/customize/owner-command-compiler.ts src/fyd/customize/owner-proposal.ts"
for f in $FILES; do
  cp "$MAIN/$f" "$WT/$f"
  echo "copied $f"
done
echo "=== sha256 match check ==="
for f in $FILES; do
  a=$(sha256sum "$MAIN/$f" | cut -d' ' -f1)
  b=$(sha256sum "$WT/$f" | cut -d' ' -f1)
  [ "$a" = "$b" ] && echo "MATCH $f" || echo "MISMATCH $f"
done
echo "=== WT STATUS ==="
cd "$WT" && git status --porcelain
