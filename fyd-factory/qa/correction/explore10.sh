cd /home/nolan/projects/ping
echo "===== fixtures dir ====="
ls src/fyd/proceduralize/__fixtures__/
echo ""
echo "===== coppersmith-graph.ts head ====="
head -60 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "===== generator signature ====="
grep -n "export function generateSiteSpec\|export interface GeneratorOptions" src/fyd/proceduralize/generator.ts | head
echo ""
echo "===== raw fixture dir ====="
ls -R src/fyd/proceduralize/raw/coppersmith-plumbing 2>/dev/null | head -20
