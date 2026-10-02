#!/bin/bash
cd /home/nolan/projects/ping
echo "=== tsx/node ==="
which node; node --version 2>/dev/null
ls node_modules/.bin/tsx 2>/dev/null || echo "no tsx in .bin"
grep -rn "^import\|from \"@/" src/lib/ping/types.ts | head -10
echo "=== evidence-state/why-this imports ==="
grep -n "^import" src/fyd/ui/evidence-state.ts* 2>/dev/null | head; ls src/fyd/ui/ | head -30
echo "=== sitespec schemas imports ==="
grep -n "^import" src/fyd/sitespec/schemas.ts 2>/dev/null | head -5; grep -n "^import" src/fyd/sitespec/safe-link.ts 2>/dev/null | head -5
echo "=== related/types imports ==="
grep -n "^import" src/fyd/object/related.ts src/fyd/object/types.ts 2>/dev/null | head -10
echo "=== fixture corpus size ==="
du -sh /home/nolan/fyd-fixtures 2>/dev/null || echo "no fixtures on pig yet"
