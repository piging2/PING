cd /home/nolan/projects/ping || exit 1
echo '=== generator.ts lines 130-300 ==='
sed -n '130,300p' src/fyd/proceduralize/generator.ts
echo '=== fixtures-structured exports ==='
grep -n "^export" src/fyd/proceduralize/__fixtures__/fixtures-structured.ts | head
echo '=== cop/hp fixture exports ==='
grep -n "^export" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts src/fyd/proceduralize/__fixtures__/happy-place-graph.ts src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | head
