cd /home/nolan/projects/ping
sed -n '43,70p' src/fyd/proceduralize/generator.ts
echo "===== object schemas in fixture ====="
grep -o '"schema": "[^"]*"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c
echo "===== object titles ====="
grep -o '"title": "[^"]*"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -30
