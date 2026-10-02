cd /home/nolan/projects/ping
grep -n "buildRenderContext" src/fyd/sitespec/render-model.ts | head
grep -n "buildRenderContext" src/fyd/sitespec/binding-verifier.ts | head
grep -n "interface RenderContext\|type RenderContext\|RenderContext {" src/fyd/components/renderer.tsx | head
sed -n "1,80p" src/fyd/components/__tests__/render.test.ts
