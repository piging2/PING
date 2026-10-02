#!/bin/bash
set -uo pipefail
cd /home/nolan/projects/ping
echo "=== untracked files in relevant dirs ==="
git status --porcelain src/fyd/owner-mode/ src/fyd/ask/ src/fyd/customize/ | head -30
echo "=== owner-command-compiler / owner-proposal in clean tree? ==="
ls /home/nolan/fyd-preview-wt/src/fyd/customize/owner-command-compiler.ts /home/nolan/fyd-preview-wt/src/fyd/customize/owner-proposal.ts 2>&1
echo "=== imports of the missing owner-mode modules ==="
for f in corrections provenance facts visibility-policy; do
  echo "--- $f imports ---"
  grep -E "from \"\./|from \"\.\./" src/fyd/owner-mode/$f.ts 2>/dev/null | head -8
done
