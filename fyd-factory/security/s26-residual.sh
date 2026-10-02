#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== ld+json in fyd ==="
grep -rn 'ld+json\|JSON.stringify' src/fyd --include='*.tsx' | grep -v __tests__ | head -10
echo "=== node.tsx href/src handling ==="
grep -n -B3 -A3 'href=\|src=' src/fyd/object/node.tsx | head -50
echo "=== object detail page data flow ==="
grep -n 'import\|resolveSafeLink\|dangerously' src/app/o/\[objectId\]/page.tsx | head -20
echo "=== any eval/Function/new Function in fyd render path ==="
grep -rn 'eval(\|new Function\|Function(' src/fyd --include='*.tsx' --include='*.ts' | grep -v __tests__ | head -10
