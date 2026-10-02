#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git status -sb | head -3
git rev-parse --abbrev-ref HEAD
echo "--- src/fyd tree (depth 2) ---"
find src/fyd -maxdepth 2 -type d | sort
