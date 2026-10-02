cd /home/nolan/projects/ping
echo "=== raw o.description / .description reads in renderer.tsx (not boundDescription) ==="
grep -n "\.description" src/fyd/components/renderer.tsx | grep -v "boundDescription" | head -20
echo "=== raw description reads in object-rail.tsx ==="
grep -n "\.description" src/fyd/components/object-rail.tsx | head
