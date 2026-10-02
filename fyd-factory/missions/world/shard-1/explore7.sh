cd /home/nolan/projects/ping
grep -n "export function SitePageView\|export const SitePageView" src/fyd/components/renderer.tsx | head -3
echo "===== section count in generator (homePage sections) ====="
sed -n '289,330p' src/fyd/proceduralize/generator.ts
