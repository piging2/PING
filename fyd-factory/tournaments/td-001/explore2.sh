#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== registry.ts ====="
cat src/fyd/components/registry.ts
echo "===== eligibility.ts (external_identity lines) ====="
grep -n "external_identity" src/fyd/builder/eligibility.ts
echo "===== eligibility full head ====="
sed -n 1,120p src/fyd/builder/eligibility.ts
