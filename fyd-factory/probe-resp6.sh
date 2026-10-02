#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== object-affordance 16rem source ==="
grep -rn "16rem" src/fyd/ | head -5
echo "=== site-client rail/trigger/ask-fyd ==="
grep -n "fyd-rail-auto\|Featured object\|min-h-\[44px\]\|ask-fyd-question\|Ask FYD" src/app/sites/_shared/site-client.tsx | head -20
echo "=== card title rendering (break/overflow) ==="
grep -n "break-all\|break-words\|overflow-wrap\|truncate\|whitespace-nowrap\|min-w-0" src/fyd/object/card.tsx src/fyd/components/renderer.tsx | head -20
echo "=== demo fixture data ==="
ls src/fyd/data/ 2>/dev/null | head -20
grep -rln "Coppersmith\|Happy Place" src/fyd/data/ 2>/dev/null | head -5
