cd /home/nolan/projects/ping
grep -n "export function buildRenderContext\|export async function buildRenderContext\|export const buildRenderContext" src/fyd/sitespec/render-model.ts src/fyd/sitespec/binding-verifier.ts
grep -n "export function resolveQuery\|export function renderSection\|export function renderSite" src/fyd/components/renderer.tsx | head
ls node_modules/.bin/tsx 2>/dev/null; which tsx 2>/dev/null; echo ---
grep -rn "renderToStaticMarkup\|renderToString" src/fyd --include="*.ts*" -l | head -5
