#!/bin/bash
set -e
cd /home/nolan/projects/ping
git branch --show-current
ls src/fyd/owner-mode
echo "---"
ls src/fyd/customize
echo "---"
git status --porcelain | head -20
echo "---"
git stash list
