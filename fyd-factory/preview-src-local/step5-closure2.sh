#!/bin/bash
set -uo pipefail
cd /home/nolan/projects/ping
echo "=== sha256 in clean tree? ==="
ls /home/nolan/fyd-preview-wt/src/fyd/proceduralize/sha256.ts 2>&1
echo "=== owner-command-compiler imports ==="
grep -E "from \"" src/fyd/customize/owner-command-compiler.ts | head -12
echo "=== owner-proposal imports ==="
grep -E "from \"" src/fyd/customize/owner-proposal.ts | head -12
echo "=== sizes ==="
wc -l src/fyd/customize/owner-command-compiler.ts src/fyd/customize/owner-proposal.ts src/fyd/owner-mode/corrections.ts src/fyd/owner-mode/provenance.ts src/fyd/owner-mode/facts.ts src/fyd/owner-mode/visibility-policy.ts
