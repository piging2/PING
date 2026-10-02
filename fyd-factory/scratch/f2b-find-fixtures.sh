#!/bin/bash
set -e
cd /home/nolan/projects/ping
git branch --show-current
echo === find fixtures ===
find . -path ./node_modules -prune -o -iname '*fixture*' -print 2>/dev/null | grep -vi node_modules | head -40
echo === fyd dirs ===
ls 2>/dev/null | head -40
