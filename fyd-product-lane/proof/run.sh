#!/bin/bash
# FYD OWNER MODE proof runner. Compiles proof/owner-mode-proof.ts with the
# lane sources (no tsx/ts-node available here) and runs it under node.
# Exits nonzero on any failure.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist journal
npx tsc -p tsconfig.json
cp register-alias.cjs dist/register-alias.cjs
node -r ./dist/register-alias.cjs dist/proof/owner-mode-proof.js
