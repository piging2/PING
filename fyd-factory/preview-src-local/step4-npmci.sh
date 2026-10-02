#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
nohup npm ci --include=optional > /home/nolan/fyd-preview-wt/npm-ci.log 2>&1 &
echo "npm ci started pid $!"
echo "=== sites/happy-place ==="
ls src/app/sites/happy-place/ src/app/sites/_shared/ | head -40
echo "=== sites/coppersmith-plumbing ==="
ls src/app/sites/coppersmith-plumbing/ | head -20
