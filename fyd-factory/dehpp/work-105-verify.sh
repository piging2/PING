#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== happy-place refs in my edited files: pre-existing or new? ==="
git diff src/fyd/components/renderer.tsx | grep -e "happy-place" -e "Happy Place" | head -5
git diff src/fyd/proceduralize/generator.ts | grep -e "happy-place" -e "Happy Place" | head -5
echo "(empty above = all pre-existing)"
echo "=== em dash lines in compose-site.ts ==="
grep -n $'\u2014' src/app/sites/_shared/compose-site.ts | head -20