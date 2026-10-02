#!/bin/bash
set -e
cd /home/nolan/projects/ping
git status --short | head -5
git rev-parse --abbrev-ref HEAD
ls
echo "---SITE FIXTURES---"
ls src/fyd 2>/dev/null | head -40
echo "---FIND SITES---"
find . -path ./node_modules -prune -o -name "*.json" -print 2>/dev/null | grep -iE "fixture|site" | head -20
