#!/bin/bash
cd /home/nolan/projects/ping
git branch --show-current
echo "---"
# Find fixture files referencing happy-place or coppersmith
find . -path ./node_modules -prune -o -type f \( -iname "*fixture*" -o -iname "*happy-place*" -o -iname "*coppersmith*" \) -print 2>/dev/null | grep -v node_modules | head -40
