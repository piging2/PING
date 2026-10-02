cd /home/nolan/projects/ping
sed -n "120,220p" src/fyd/sitespec/render-model.ts
echo === SitePageView sig ===
grep -n "SitePageView\|export interface RenderContext\|^export interface\|^export function" src/fyd/components/renderer.tsx | head -30
