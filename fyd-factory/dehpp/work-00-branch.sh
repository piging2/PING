#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== current HEAD ==="
git rev-parse HEAD
echo "=== status of render path vs frozen ==="
git status --porcelain | head -20
echo "=== creating branch fyd-dehpp from frozen commit ==="
git checkout -b fyd-dehpp e48ef710cb889bf4d59b833ef9766067a9e2bbf0 2>&1 | tail -2
echo "=== now on ==="
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
echo "=== strategy/planner/dimensions files at frozen SHA ==="
git ls-tree -r --name-only HEAD | grep -Ei '(strateg|planner|dimension|site-vector|archetype|builder)' | head -40
