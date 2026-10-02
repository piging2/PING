cd /home/nolan/projects/ping
echo "===== buildRenderContext signature ====="
grep -n "export function buildRenderContext\|export async function buildRenderContext" src/fyd/sitespec/render-model.ts
sed -n '/export function buildRenderContext/,+40p' src/fyd/sitespec/render-model.ts | head -60
echo "===== dogfood test render approach ====="
grep -n "renderToStaticMarkup\|renderToString\|ReactDOMServer" src/fyd/components/__tests__/ping-fyd-dogfood.test.ts | head
echo "===== node_modules react-dom/server present? ====="
ls node_modules/react-dom/server.node.js 2>/dev/null; node -e "console.log(require.resolve('react-dom/server'))" 2>&1 | head -2
echo "===== ObjectGraph type ====="
grep -n "interface ObjectGraph\|type ObjectGraph" src/fyd/sitespec/types.ts
sed -n '/ObjectGraph/,/^}/p' src/fyd/sitespec/types.ts | head -30
echo "===== tsx availability ====="
ls node_modules/.bin/tsx 2>/dev/null; node --version
