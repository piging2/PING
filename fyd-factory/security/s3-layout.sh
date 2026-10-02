#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== src/fyd top-level dirs ==="
find src/fyd -maxdepth 1 -type d | sort
echo "=== renderer-ish files ==="
find src/fyd -type f -name '*.ts' -o -type f -name '*.tsx' | grep -iE 'render|build|project|spec|site' | grep -v __tests__ | sort | head -60
echo "=== fixtures ==="
find src/fyd/proceduralize/__fixtures__ -type f 2>/dev/null | head -20
echo "=== total tsx files in fyd ==="
find src/fyd -name '*.tsx' | wc -l
