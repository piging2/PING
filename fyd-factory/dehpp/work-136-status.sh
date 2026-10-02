#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git status --porcelain | grep -v "^?? node_modules"
echo "=== diff stat ==="
git diff --stat | tail -8