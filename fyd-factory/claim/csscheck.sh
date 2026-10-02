#!/bin/bash
cd /home/nolan/projects/ping
find . -maxdepth 2 -name "*jest*" -not -path "./node_modules/*" 2>/dev/null
grep -rn "moduleNameMapper\|identity-obj-proxy" package.json jest* 2>/dev/null | head
echo "--- css imports in renderer chain ---"
grep -rln "\.module\.css\|\.css'" src/fyd/components/renderer.tsx src/fyd/ui/object-circle.tsx 2>/dev/null | head
grep -n "import.*css" src/fyd/ui/object-circle.tsx | head -5
