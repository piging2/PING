#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== BRANCH ==="
git branch --show-current
echo "=== GIT STATUS (short, read-only check) ==="
git status --porcelain | head -20
echo "=== src/fyd layout ==="
ls src/fyd/ 2>&1
echo "=== src/fyd/claim ==="
ls -R src/fyd/claim 2>&1 | head -60
echo "=== src/fyd/sitespec ==="
ls -R src/fyd/sitespec 2>&1 | head -60
echo "=== src/fyd/object ==="
ls -R src/fyd/object 2>&1 | head -60
echo "=== src/fyd/acquisition ==="
ls -R src/fyd/acquisition 2>&1 | head -60
