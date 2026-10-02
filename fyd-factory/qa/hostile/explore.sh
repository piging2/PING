#!/bin/bash
set -e
cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD
git status --porcelain | head -5
echo "--- boundary ---"
ls -la src/fyd/boundary/
echo "--- fyd top ---"
ls src/fyd/ | head -30
