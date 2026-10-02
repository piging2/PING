#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== builder/index.ts ==="
head -120 src/fyd/builder/index.ts
echo ""
echo "=== renderer-ish files ==="
ls src/fyd/ui/ src/fyd/ui/object-layer 2>/dev/null
grep -rl "renderSite\|renderPage\|renderObjectGraph\|renderToString\|renderToStaticMarkup" src/fyd --include="*.ts" --include="*.tsx" -l | grep -v __tests__ | head -20
