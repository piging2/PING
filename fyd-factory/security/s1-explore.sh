#!/bin/bash
set -u
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
git rev-parse --abbrev-ref HEAD
git status --porcelain | head -5
echo "=== boundary layout ==="
find src/fyd/boundary -type f | sort
echo "=== boundary dir sizes ==="
wc -l src/fyd/boundary/* 2>/dev/null | tail -5
