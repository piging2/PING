#!/bin/bash
# W4 Audit A - recon11: read seam ownerFieldCorrections + dumper source input
set -u
WT=/tmp/w4-audit-ping
echo "=== A. ping-object-source.ts lines 300-400 ==="
sed -n '300,400p' "$WT/src/fyd/data/ping-object-source.ts"
echo "=== B. dumper input: what source does it read? ==="
sed -n '1,80p' "$WT/src/fyd/builder/dogfood/build-ping-fyd-projection.mjs"
