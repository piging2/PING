cd /home/nolan/projects/ping
sed -n "130,226p" src/fyd/components/renderer.tsx
echo === isRenderable ===
grep -n "export function isRenderable" -A 10 src/fyd/sitespec/validator.ts
