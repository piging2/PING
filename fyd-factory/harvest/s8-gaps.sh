#!/bin/bash
# s8: final gaps - audit, brand tokens, search routes, reviews, ping components (read-only)
cd /home/nolan/projects/ping || exit 1
echo "########## infrastructure/audit.ts head ##########"; head -45 src/lib/infrastructure/audit.ts
echo; echo "########## globals.css sample tokens ##########"; grep -m 12 -E '^\s*--(color|font|space|radius)' src/app/globals.css
echo; echo "########## search routes ##########"
grep -rli --include='*.ts' --include='*.tsx' -E 'full.?text|searchIndex|searchResults' src/app/api src/lib src/components 2>/dev/null | grep -v fyd | head -8
echo "########## reviews.ts head ##########"; head -30 src/lib/reviews.ts
echo "########## components/ping ##########"; ls src/components/ping/ src/components/editor/ src/components/architecture/ 2>/dev/null
echo "########## events.ts head ##########"; head -30 src/lib/events.ts
