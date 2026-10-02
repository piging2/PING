#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== vitest configs ==="
ls vitest.config.* vitest.workspace.* 2>/dev/null
grep -l "globals" vitest.config.* 2>/dev/null
echo "=== test scripts ==="
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts, null, 1))" 2>/dev/null | head -20
echo "=== does config set globals? ==="
grep -n "globals" vitest.config.* 2>/dev/null || echo "no globals setting"
echo "=== baseline: does the PRISTINE test file also fail this way? ==="
git stash list | head -2
git show HEAD:src/fyd/sitespec/__tests__/schemas.test.ts > /tmp/schemas-test-pristine.ts
mkdir -p /tmp/vitest-baseline && cp /tmp/schemas-test-pristine.ts /tmp/vitest-baseline/
echo "(checking whether describe-globals failure predates my change)"
