cd /home/nolan/projects/ping
grep -n "resolveQuery(" src/fyd/components/renderer.tsx src/fyd/sitespec/render-model.ts | grep -v "export function" | head
