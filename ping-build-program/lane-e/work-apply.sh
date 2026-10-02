#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== pre-write verification ==="
git worktree list --porcelain | head -3
git branch --show-current
git rev-parse --short HEAD
echo "--- target files must be clean ---"
git status --short src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts src/fyd/sitespec/__tests__/schemas.test.ts
test -e src/fyd/sitespec/schema-roles.ts && { echo "note: schema-roles.ts exists from prior partial run; patch overwrites it"; }
echo "(blank above = clean, proceeding)"
echo "=== applying patch ==="
echo "__PATCH_B64__" | base64 -d > /tmp/lane-e-converge-patch.py
python3 /tmp/lane-e-converge-patch.py
echo "=== diff stat ==="
git status --short src/fyd/sitespec/ src/fyd/components/registry.ts
git diff --stat -- src/fyd/sitespec/schemas.ts src/fyd/sitespec/schema-roles.ts src/fyd/components/registry.ts src/fyd/sitespec/__tests__/schemas.test.ts
