#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== roleQuery / section / presentation ==="
grep -n "featuredIds\|function roleQuery\|function section\|function add\|copy:\|heading:" src/fyd/proceduralize/generator.ts | head -30
echo ""
sed -n '120,160p' src/fyd/proceduralize/generator.ts
