#!/bin/bash
# F3-DESIGN-C probe: SiteSpec type, components, dogfood + F2 corpus fixtures (technology graphs)
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
echo "=== branch ==="; git branch --show-current 2>/dev/null
echo "=== src/fyd/sitespec ==="; ls -la src/fyd/sitespec/ 2>/dev/null || echo "NO src/fyd/sitespec"
echo "=== sitespec type files (head 120) ==="
for f in src/fyd/sitespec/*.ts src/fyd/sitespec/*.tsx; do
  [ -f "$f" ] && echo "--- $f" && head -120 "$f"
done 2>/dev/null
echo "=== src/fyd/components (top level) ==="
ls src/fyd/components/ 2>/dev/null || echo "NO src/fyd/components"
echo "=== src/fyd dir ==="; ls src/fyd/ 2>/dev/null
echo "=== fixture search: dogfood / ping / fyd ==="
find . -path ./node_modules -prune -o -type f \( -iname "*dogfood*" -o -iname "*ping-fixture*" -o -iname "*fyd-fixture*" \) -print 2>/dev/null | grep -v node_modules | head -20
echo "=== fixture search: graph ==="
find . -path ./node_modules -prune -o -type f -iname "*graph*fixture*" -print 2>/dev/null | grep -v node_modules | head -20
echo "=== F2 corpus search ==="
find . -path ./node_modules -prune -o -iname "*f2*" -print 2>/dev/null | grep -v node_modules | head -30
echo "=== technology / software fixture search ==="
find . -path ./node_modules -prune -o -type f \( -iname "*technology*" -o -iname "*software-company*" -o -iname "*saas*" \) -print 2>/dev/null | grep -v node_modules | grep -v package | head -20
echo "=== demo dirs ==="
ls src/fyd/demo 2>/dev/null; ls demos 2>/dev/null; find . -maxdepth 2 -path ./node_modules -prune -o -type d -iname "*demo*" -print 2>/dev/null | grep -v node_modules | head
echo "=== git status (first 5) ==="; git status --short 2>/dev/null | head -5
