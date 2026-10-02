cd /home/nolan/projects/ping
grep -rn "\"conflicts\"\|conflicts:" src/fyd/sitespec/types.ts src/lib/ping/types.ts 2>/dev/null | head
grep -rn "conflict" src/fyd/proceduralize/generator.ts | head -20
grep -rln "PHONE CONFLICT\|no canonical phone" src/fyd/ src/lib/ 2>/dev/null | head
