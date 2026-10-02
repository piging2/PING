#!/bin/bash
# F5-CEILING probe A: repo structure on branch fyd-factory
set -e
cd /home/nolan/projects/ping
git status -sb | head -5
git rev-parse --abbrev-ref HEAD
echo "=== top level ==="
ls
echo "=== find fyd factory dirs ==="
find . -maxdepth 3 -type d -iname "*fyd*" 2>/dev/null | head -30
echo "=== find spec/planner ==="
find . -maxdepth 4 -iname "*sitespec*" -o -maxdepth 4 -iname "*planner*" 2>/dev/null | grep -v node_modules | head -40
