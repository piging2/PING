cd /home/nolan/projects/ping
grep -n "ObjectRail\|presence" src/fyd/components/renderer.tsx | head -20
echo "=== presence in types ==="
grep -n "presence" src/fyd/sitespec/types.ts | head -10
