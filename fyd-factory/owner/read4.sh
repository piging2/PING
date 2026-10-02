#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== sitespec dir ====="
ls src/fyd/sitespec/
echo "===== proceduralize dir ====="
ls src/fyd/proceduralize/ 2>/dev/null | head -30
echo "===== patches dir ====="
ls ~/workspace/fyd-factory/patches/ 2>/dev/null | head -20 || ls /home/hatch/workspace/fyd-factory/patches/ | head -20
