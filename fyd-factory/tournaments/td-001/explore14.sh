#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== jest config ====="
cat jest.config.cjs 2>/dev/null | head -40; ls jest.config* 2>/dev/null
echo "===== tsconfig paths ====="
grep -A8 '"paths"' tsconfig.json
echo "===== spec-compat test ====="
sed -n '1,50p' src/fyd/sitespec/__tests__/spec-compat.test.ts
echo "===== node/tsx availability ====="
which tsx; node -e "console.log('node ok')"
