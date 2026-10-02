cd /home/nolan/projects/ping
echo "===== generateSiteSpec signature ====="
grep -n "export function generateSiteSpec" -A 8 src/fyd/proceduralize/generator.ts
echo "===== PingObject interface ====="
sed -n '108,150p' src/lib/ping/types.ts
echo "===== PingRelationship ====="
grep -n "interface PingRelationship" -A 20 src/lib/ping/types.ts | head -30
echo "===== SCHEMA_ROLES ====="
grep -n "SCHEMA_ROLES" -A 20 src/fyd/sitespec/schemas.ts | head -40
echo "===== buildRenderContext sig ====="
sed -n '187,230p' src/fyd/components/renderer.tsx
echo "===== ViewerContext ====="
grep -n "interface ViewerContext" -A 12 src/fyd/sitespec/types.ts | head -18
