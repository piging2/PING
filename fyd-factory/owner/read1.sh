#!/bin/bash
set -e
cd /home/nolan/projects/ping
for f in src/fyd/owner-mode/capability.ts src/fyd/owner-mode/gate.ts src/fyd/owner-mode/demo-chain.ts src/fyd/owner-mode/attestation-gate.ts; do
  echo "===== $f ====="
  cat "$f"
done
