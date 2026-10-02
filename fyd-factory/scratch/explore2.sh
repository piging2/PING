#!/bin/bash
cd /home/nolan/projects/ping
echo "=== fyd factory dirs ==="
find src/fyd -maxdepth 2 -type d | sort
echo "=== factory dir detail ==="
find src/fyd/factory -type f 2>/dev/null | head -40
echo "=== corpus mentions ==="
grep -ril "corpus" src/fyd 2>/dev/null | head -20
