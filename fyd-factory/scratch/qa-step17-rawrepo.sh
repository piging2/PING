#!/bin/bash
cd /home/nolan/projects/ping
echo "=== raw dir in repo ==="
ls -la src/fyd/proceduralize/raw/ 2>&1
ls -la src/fyd/proceduralize/raw/coppersmith-plumbing/ 2>&1
echo ""
echo "=== verify digests match fixture header ==="
sha256sum src/fyd/proceduralize/raw/coppersmith-plumbing/* 2>&1
