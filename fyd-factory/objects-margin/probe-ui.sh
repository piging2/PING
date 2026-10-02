#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
git branch --show-current
echo "##### src/fyd/ui tree #####"
find src/fyd/ui -type f | sort | head -40
echo "##### portal-circle #####"
for f in src/fyd/ui/portal-circle.tsx src/fyd/ui/portal-circle/index.tsx; do [ -f "$f" ] && { echo "--- $f"; sed -n '1,120p' "$f"; }; done
