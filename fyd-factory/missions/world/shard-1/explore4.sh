cd /home/nolan/projects/ping
grep -rn "buildRenderContext" src/fyd/sitespec/render-model.ts | head
grep -rn "export.*buildRenderContext\|function buildRenderContext" src/fyd/sitespec/*.ts src/fyd/components/*.tsx 2>/dev/null | head
echo "===== dogfood test head ====="
sed -n '1,70p' src/fyd/components/__tests__/ping-fyd-dogfood.test.ts
echo "===== PingObject type ====="
grep -n "interface PingObject\|type PingObject" src/lib/ping/types.ts | head -3
