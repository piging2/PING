#!/bin/bash
cd /home/nolan/workspace/fyd-factory/qa/design-conv
echo "=== sizes ==="
ls -la
echo "=== happy-place head ==="
head -c 2500 happy-place.html
echo ""
echo "=== grep schema.org blocks ==="
grep -o '<script type="application/ld+json">[^<]*' happy-place.html | head -c 1500
echo ""
echo "=== coppersmith head ==="
head -c 1500 coppersmith-plumbing.html
