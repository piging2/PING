#!/bin/bash
set -u
cd /home/nolan/projects/ping
git status --porcelain | head -10
echo "=== confirm no source edits (only untracked test file expected) ==="
git diff --stat | tail -3
