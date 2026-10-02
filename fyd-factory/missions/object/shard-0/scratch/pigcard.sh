cd /home/nolan/projects/ping
echo "=== ObjectCard usages ==="
grep -rn "ObjectCard" src/fyd --include="*.tsx" -l | head
echo "=== pingObjectToProjection callers ==="
grep -rn "pingObjectToProjection" src/fyd --include="*.tsx" | grep -v "object-rail.tsx" | grep -v "__tests__" | head
