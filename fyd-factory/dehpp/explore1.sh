#!/bin/bash
cd /home/nolan/projects/ping
echo "##### happy-place site route"
find src/app -path '*happy-place*' -o -name '*happy*' 2>/dev/null | head -20
echo "##### sites dir"
find . -maxdepth 3 -type d -name 'sites' 2>/dev/null | head
echo "##### all routes mentioning happy-place"
grep -rln "happy-place" src/app 2>/dev/null | head -20
