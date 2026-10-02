#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== target test dir contents ==="
ls src/fyd/sitespec/__tests__/
echo "=== name collision check ==="
ls src/fyd/sitespec/__tests__/explore-external-identity.test.ts 2>/dev/null || echo "no collision: file absent"
echo "=== worktree clean? ==="
git status --porcelain | head -5
