#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== proceduralize/raw ====="
ls -la src/fyd/proceduralize/raw/ 2>/dev/null
echo "===== proceduralize/runs ====="
ls -la src/fyd/proceduralize/runs/ 2>/dev/null | head -20
echo "===== ask-composer (head) ====="
ls src/lib/ping/ | head -30
echo "===== structured-data.ts head ====="
head -100 src/fyd/proceduralize/structured-data.ts
