#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git ls-files src/app/sites/ | head -10
echo "=== does coppersmith exist at frozen commit? ==="
git ls-files src/app/sites/coppersmith-plumbing/ | head -5