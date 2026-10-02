cd /home/nolan/projects/ping || exit 1
echo '=== proceduralize dir ==='
ls src/fyd/proceduralize/
echo '=== generator component refs ==='
grep -n '"Hero"\|"Services"\|"Products"\|"Locations"\|"People"\|"Posts"\|"Contact"\|"Links"\|"SocialProof"\|"CTA"\|"AskFYD"\|"Gallery"\|"ObjectRail"\|"ObjectGrid"\|"ObjectFeed"\|"RecentObjects"\|"BusinessSummary"\|"IdentityCard"' src/fyd/proceduralize/*.ts | grep -v __tests__ | grep -v __fixtures__ | head -60
echo '=== tools: tsx/ts-node ==='
ls node_modules/.bin/ 2>/dev/null | grep -E '^(tsx|ts-node|esbuild)' | head
