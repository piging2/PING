cd /home/nolan/projects/ping
echo "=== object-rail tests referencing description/summary ==="
grep -n "description\|summary" src/fyd/components/__tests__/object-rail.test.ts | head -20
echo "=== richestObject ==="
grep -n "richestObject" -A 25 src/fyd/components/object-rail.tsx | sed -n 1,35p
echo "=== pingObjectToProjection usages ==="
grep -n "pingObjectToProjection" src/fyd/components/object-rail.tsx
