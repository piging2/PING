cd /home/nolan/projects/ping
echo "=== callers of pingObjectToProjection / pingObjectToView ==="
grep -rn "pingObjectToProjection\|pingObjectToView" src --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v "object-rail.tsx"
echo "=== PresentationBinding interface ==="
sed -n 60,100p src/fyd/sitespec/graph.ts
echo "=== graph.ts imports ==="
sed -n 1,40p src/fyd/sitespec/graph.ts | grep -n "import"
