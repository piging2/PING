#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== dangerouslySetInnerHTML in fyd ==="
grep -rn 'dangerouslySetInnerHTML' src/fyd --include='*.tsx' --include='*.ts' | grep -v __tests__ | head -30
echo "=== href= assignments in renderer.tsx ==="
grep -n 'href' src/fyd/components/renderer.tsx | head -40
echo "=== src= assignments in renderer.tsx ==="
grep -n 'src=' src/fyd/components/renderer.tsx | head -40
echo "=== style= in renderer.tsx ==="
grep -n 'style=' src/fyd/components/renderer.tsx | head -30
echo "=== resolveSafeLink callers ==="
grep -rn 'resolveSafeLink' src/fyd --include='*.tsx' --include='*.ts' | grep -v __tests__ | grep -v 'sitespec/safe-link' | head -20
