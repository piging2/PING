#!/bin/bash
set -e
cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD
git status --porcelain | wc -l
git status --porcelain
echo "=== strategyForSite definition ==="
git grep -n "strategyForSite" HEAD -- '*.ts' | grep -v __tests__ | head -10
echo "=== archetype profile shape ==="
head -100 src/fyd/archetypes/profiles.ts
